import { useState, useEffect, useMemo, useRef } from 'react';
import { updateProduct } from '../../api/catalog';

const idOf = (x) => (x && x._id) ? x._id : x;
const SEXO_LABEL = { mujer: 'Dama', hombre: 'Caballero', unisex: 'Unisex' };
const SEXO_CLS = {
  mujer: 'bg-pink-100 text-pink-700',
  hombre: 'bg-blue-100 text-blue-700',
  unisex: 'bg-gray-100 text-gray-700'
};
const cellInputCls = 'border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500';

const cleanSku = (s) => String(s || '').replace(/\s+/g, '').toUpperCase();
// Cada SKU ya guardado lleva `orig` (su valor en la base) para detectar si se
// modificó o quitó; los agregados en esta edición no lo traen.
const toDraft = (variants) => Object.fromEntries(
  variants.map((v) => [v._id, (v.skusErp || []).map(({ sku, sexo }) => ({ sku, sexo, orig: { sku, sexo } }))])
);
const sameList = (a, b) => a.length === b.length && a.every((e, i) => cleanSku(e.sku) === b[i].sku && e.sexo === b[i].sexo);

// SKUs (variants[].skusErp) de cada variante color+talla. Una variante de un
// producto dama+caballero lleva un SKU por género. Se consultan y, con
// "Editar SKUs", se agregan / modifican / quitan; se guardan con su propio
// botón (PUT de variants), aparte del resto del formulario — igual que
// VariantesManager. La API rechaza un SKU que ya esté en otro producto.
// `highlightSku` resalta la variante encontrada al buscar por SKU desde la
// lista de productos.
export default function SkusErpTabla({ productId, product, colorOptionId, highlightSku, onChanged }) {
  const variants = useMemo(() => product?.variants || [], [product]);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => toDraft(variants));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const hiRef = useRef(null);
  const hi = highlightSku ? String(highlightSku).toUpperCase() : '';

  // Si el producto se recarga (tras guardar u otra sección), parte de lo guardado.
  useEffect(() => { setDraft(toDraft(variants)); }, [variants]);

  // Sexo sugerido al agregar: el del producto si es uno solo; si es
  // dama+caballero, el género que aún no tenga SKU en esa variante.
  const sexosProducto = (Array.isArray(product?.sexo) ? product.sexo : [product?.sexo]).filter(Boolean);
  const sexoSugerido = (lista) => {
    if (sexosProducto.length === 1) return sexosProducto[0];
    return ['hombre', 'mujer'].find((s) => sexosProducto.includes(s) && !lista.some((e) => e.sexo === s)) || 'unisex';
  };

  const rows = useMemo(() => {
    const list = variants.map((v) => {
      const vals = (v.optionValues || []).filter((o) => o && typeof o === 'object');
      const color = colorOptionId ? vals.find((o) => idOf(o.option) === colorOptionId) : vals[0];
      const talla = vals.find((o) => o !== color);
      return { v, color, talla };
    });
    return list.sort((a, b) =>
      (a.color?.valor || '').localeCompare(b.color?.valor || '', 'es') ||
      (a.talla?.orden ?? 0) - (b.talla?.orden ?? 0) ||
      (a.talla?.valor || '').localeCompare(b.talla?.valor || '', 'es'));
  }, [variants, colorOptionId]);

  const erpOf = (v) => (editing ? draft[v._id] || [] : v.skusErp || []);
  const total = rows.length;
  const conErp = rows.filter((r) => erpOf(r.v).length).length;
  const totalSkus = rows.reduce((s, r) => s + erpOf(r.v).length, 0);
  const dirty = editing && variants.some((v) => !sameList(draft[v._id] || [], v.skusErp || []));

  const term = q.trim().toUpperCase();
  const visibles = term
    ? rows.filter((r) => [r.v.sku, r.color?.valor, r.talla?.valor, ...erpOf(r.v).map((e) => e.sku)].some((t) => String(t || '').toUpperCase().includes(term)))
    : rows;

  useEffect(() => {
    if (hi && hiRef.current) hiRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [hi, rows.length]);

  const setVariantSkus = (vid, fn) => { setDraft((d) => ({ ...d, [vid]: fn(d[vid] || []) })); setSaved(false); setError(null); };
  const addSku = (vid) => setVariantSkus(vid, (l) => [...l, { sku: '', sexo: sexoSugerido(l) }]);
  const updSku = (vid, i, patch) => setVariantSkus(vid, (l) => l.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  const delSku = (vid, i) => setVariantSkus(vid, (l) => l.filter((_, idx) => idx !== i));

  const cancel = () => { setDraft(toDraft(variants)); setEditing(false); setError(null); };

  // Cambios a SKUs que YA existían (modificados o quitados), para confirmarlos.
  const cambiosExistentes = () => {
    const out = [];
    for (const { v, color, talla } of rows) {
      const donde = [color?.valor, talla?.valor].filter(Boolean).join(' ') || v.sku;
      const lista = draft[v._id] || [];
      for (const o of v.skusErp || []) {
        const e = lista.find((x) => x.orig?.sku === o.sku);
        if (!e) { out.push(`${donde}: se quitará ${o.sku}`); continue; }
        const nuevo = cleanSku(e.sku);
        if (nuevo !== o.sku) out.push(`${donde}: ${o.sku} → ${nuevo}`);
        if (e.sexo !== o.sexo) out.push(`${donde}: ${nuevo} de ${SEXO_LABEL[o.sexo] || o.sexo} a ${SEXO_LABEL[e.sexo] || e.sexo}`);
      }
    }
    return out;
  };

  const save = async () => {
    // Validación local antes de ir a la API: sin SKUs vacíos ni repetidos
    // dentro del producto (la API revalida y además revisa el resto del catálogo).
    const seen = new Set();
    for (const { v, color, talla } of rows) {
      for (const e of draft[v._id] || []) {
        const s = cleanSku(e.sku);
        const donde = [color?.valor, talla?.valor].filter(Boolean).join(' ');
        if (!s) { setError(`Falta escribir un SKU en ${donde || 'una variante'} (o quítalo con ×).`); return; }
        if (seen.has(s)) { setError(`El SKU ${s} está repetido en este producto.`); return; }
        seen.add(s);
      }
    }

    const cambios = cambiosExistentes();
    if (cambios.length) {
      const MAX = 15;
      const detalle = cambios.slice(0, MAX).join('\n') + (cambios.length > MAX ? `\n… y ${cambios.length - MAX} cambio(s) más` : '');
      if (!confirm(`Vas a modificar ${cambios.length} SKU(s) que ya existen:\n\n${detalle}\n\n¿Estás seguro de guardar estos cambios?`)) return;
    }

    setBusy(true); setError(null);
    try {
      const payload = variants.map((v) => ({
        sku: v.sku,
        skusErp: (draft[v._id] || []).map((e) => ({ sku: cleanSku(e.sku), sexo: e.sexo })),
        optionValues: (v.optionValues || []).map(idOf),
        composicion: v.composicion || undefined,
        stock: v.stock || 0,
        activo: v.activo !== false
      }));
      await updateProduct(productId, { variants: payload });
      await onChanged();
      setEditing(false);
      setSaved(true);
    } catch (e) {
      const detalle = Object.values(e.fields || {}).join(' · ');
      setError((detalle || e.message || 'No se pudieron guardar los SKUs').replace(/SKU de ERP/g, 'SKU'));
    } finally {
      setBusy(false);
    }
  };

  if (total === 0) return <p className="text-sm text-gray-400">Este producto aún no tiene variantes.</p>;

  return (
    <div className="space-y-3">
      {error && <div className="bg-red-50 text-red-700 text-sm rounded-md px-3 py-2">{error}</div>}

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-medium text-gray-900">{totalSkus} SKUs</span>
        <span className="text-gray-500">en {conErp} de {total} variantes</span>
        {conErp < total && (
          <span className="text-xs bg-amber-50 text-amber-700 rounded px-2 py-1">
            {total - conErp} variante{total - conErp === 1 ? '' : 's'} sin SKU
          </span>
        )}
        <input
          type="search" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Filtrar por SKU, color o talla…"
          className="ml-auto w-full sm:w-64 border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="overflow-auto max-h-96 border border-gray-200 rounded-md">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 font-medium">Color</th>
              <th className="px-3 py-2 font-medium">Talla</th>
              <th className="px-3 py-2 font-medium">SKU interno</th>
              <th className="px-3 py-2 font-medium">SKU(s)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibles.map(({ v, color, talla }) => {
              const erp = erpOf(v);
              const esHi = hi && erp.some((e) => cleanSku(e.sku) === hi);
              return (
                <tr key={v._id || v.sku} ref={esHi ? hiRef : null} className={esHi ? 'bg-yellow-50 ring-2 ring-inset ring-yellow-300' : ''}>
                  <td className="px-3 py-2 text-gray-900 align-top">{color?.valor ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-700 align-top">{talla?.valor ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-500 align-top">{v.sku}</td>
                  <td className="px-3 py-2">
                    {editing ? (
                      <div className="space-y-1.5">
                        {erp.map((e, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input
                              className={`${cellInputCls} font-mono w-56 uppercase`} value={e.sku} placeholder="SKU"
                              onChange={(ev) => updSku(v._id, i, { sku: ev.target.value })}
                            />
                            <select className={cellInputCls} value={e.sexo} onChange={(ev) => updSku(v._id, i, { sexo: ev.target.value })}>
                              {Object.entries(SEXO_LABEL).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                            </select>
                            <button type="button" onClick={() => delSku(v._id, i)} title="Quitar SKU" className="text-red-600 hover:text-red-800 px-1">✕</button>
                          </div>
                        ))}
                        <button type="button" onClick={() => addSku(v._id)} className="text-xs text-indigo-600 hover:text-indigo-800">+ SKU</button>
                      </div>
                    ) : erp.length === 0 ? <span className="text-gray-300">—</span> : (
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {erp.map((e) => (
                          <span key={e.sku} className="inline-flex items-center gap-2">
                            <span className="font-mono text-xs text-gray-900">{e.sku}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${SEXO_CLS[e.sexo] || SEXO_CLS.unisex}`}>{SEXO_LABEL[e.sexo] || e.sexo}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {visibles.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-400">Sin resultados para “{q}”.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        {editing ? (
          <>
            <button type="button" disabled={busy || !dirty} onClick={save}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md">
              {busy ? 'Guardando…' : 'Guardar SKUs'}
            </button>
            <button type="button" disabled={busy} onClick={cancel}
              className="px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
            {dirty && <span className="text-xs text-amber-700">Cambios sin guardar</span>}
          </>
        ) : (
          <>
            <button type="button" onClick={() => { setEditing(true); setSaved(false); }}
              className="px-4 py-2 rounded-md border border-indigo-300 text-sm font-medium text-indigo-700 hover:bg-indigo-50">
              Editar SKUs
            </button>
            {saved && <span className="text-xs text-green-600">Guardado ✓</span>}
          </>
        )}
      </div>
    </div>
  );
}
