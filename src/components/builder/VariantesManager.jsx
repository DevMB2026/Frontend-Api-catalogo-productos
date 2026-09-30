import { useState, useEffect } from 'react';
import { updateProduct } from '../../api/catalog';
import { valoresComunes } from '../../lib/variantModel';

const idOf = (x) => (x && x._id) ? x._id : x;
const inputCls = 'w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

// Stock y composición son un solo valor para TODO el producto (no varían por
// talla/color en la práctica) — se aplican a todas las variantes al guardar.
// Necesita el _id de cada variante, que solo existe tras crear el producto.
// Las imágenes NO se tocan aquí: viven en product.media (ver MediaManager).
export default function VariantesManager({ productId, product, onChanged }) {
  const variants = product.variants || [];
  const [stock, setStockValue] = useState(0);
  const [composicion, setComposicion] = useState('');
  const [base, setBase] = useState(''); // composición común al cargar
  const [reemplazarDistintas, setReemplazarDistintas] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  // Si el producto se recarga (tras guardar u otra edición), precarga los
  // valores actuales: el que más se repite, ignorando variantes vacías. Antes
  // bastaba UNA variante sin composición (ej. una talla agregada después)
  // para que el campo saliera vacío y pareciera que no se había guardado.
  useEffect(() => {
    setSaved(false);
    setReemplazarDistintas(false);
    const comunes = valoresComunes(variants);
    setBase(comunes.composicion);
    setComposicion(comunes.composicion);
    setStockValue(comunes.stock);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  // El campo edita la composición COMÚN: se aplica a las variantes vacías y a
  // las que tenían la común. Una variante con OTRA composición (ej. un color
  // de otra tela) se conserva, salvo que se pida reemplazarla explícitamente.
  const vacias = variants.filter((v) => !v.composicion);
  const distintas = variants.filter((v) => v.composicion && v.composicion !== base);
  const composicionFinal = (v) => ((!v.composicion || v.composicion === base || reemplazarDistintas) ? composicion : v.composicion);
  const stockDistinto = variants.filter((v) => (v.stock || 0) !== Number(stock)).length;

  const dirty = variants.some((v) => (v.composicion || '') !== (composicionFinal(v) || '') || (v.stock || 0) !== Number(stock));

  const save = async () => {
    setBusy(true); setError(null);
    try {
      // Sin _id/media/activo que no hagan falta: la API conserva de cada
      // variante lo que no se manda (ver variantMerge.service.js).
      const payload = variants.map((v) => ({
        sku: v.sku,
        skusErp: v.skusErp?.length ? v.skusErp.map(({ sku, sexo }) => ({ sku, sexo })) : undefined,
        optionValues: (v.optionValues || []).map(idOf),
        composicion: composicionFinal(v) || undefined,
        stock: Number(stock) || 0,
        activo: v.activo !== false
      }));
      await updateProduct(productId, { variants: payload });
      await onChanged();
      setSaved(true);
    } catch (e) {
      setError(e.message || 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  };

  if (variants.length === 0) {
    return <p className="text-sm text-gray-400">Aún no hay variantes. Define tallas y colores arriba y guarda el producto primero.</p>;
  }

  return (
    <div className="space-y-3">
      {error && <div className="bg-red-50 text-red-700 text-sm rounded-md px-3 py-2">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-[8rem_1fr] gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Stock (todas las tallas y colores)</label>
          <input type="number" min="0" className={inputCls} value={stock}
            onChange={(e) => { setStockValue(e.target.value); setSaved(false); }} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Composición (todas las tallas y colores)</label>
          <input className={inputCls} placeholder="60% algodón, 40% poliéster"
            value={composicion} onChange={(e) => { setComposicion(e.target.value); setSaved(false); }} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" disabled={busy || !dirty} onClick={save}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md">
          {busy ? 'Guardando…' : 'Guardar stock y composición'}
        </button>
        {saved && !dirty && <span className="text-xs text-green-600">Guardado ✓</span>}
      </div>

      {vacias.length > 0 && composicion && (
        <p className="text-xs text-amber-700">
          {vacias.length} de {variants.length} variantes no tienen composición (ej. tallas o colores agregados después). Al guardar se les aplica esta.
        </p>
      )}
      {distintas.length > 0 && (
        <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <p>
            {distintas.length} variante{distintas.length === 1 ? '' : 's'} con otra composición
            ({[...new Set(distintas.map((v) => v.composicion))].map((c) => `"${c}"`).join(', ')}).
            {reemplazarDistintas ? ' Se reemplazarán por la de arriba.' : ' Se conservan al guardar.'}
          </p>
          <label className="mt-1 flex cursor-pointer items-center gap-1.5">
            <input type="checkbox" className="accent-indigo-600" checked={reemplazarDistintas}
              onChange={(e) => { setReemplazarDistintas(e.target.checked); setSaved(false); }} />
            Reemplazarlas también
          </label>
        </div>
      )}
      {stockDistinto > 0 && stockDistinto < variants.length && (
        <p className="text-xs text-gray-500">
          {stockDistinto} de {variants.length} variantes tienen otro stock; al guardar todas quedan en {Number(stock) || 0}.
        </p>
      )}
    </div>
  );
}
