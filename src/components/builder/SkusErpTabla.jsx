import { useState, useEffect, useMemo, useRef } from 'react';

const idOf = (x) => (x && x._id) ? x._id : x;
const SEXO_LABEL = { mujer: 'Dama', hombre: 'Caballero', unisex: 'Unisex' };
const SEXO_CLS = {
  mujer: 'bg-pink-100 text-pink-700',
  hombre: 'bg-blue-100 text-blue-700',
  unisex: 'bg-gray-100 text-gray-700'
};

// Vista de SOLO LECTURA de los SKUs del ERP (variants[].skusErp) de cada
// variante color+talla. Una variante de un producto dama+caballero trae un SKU
// por género. Los SKUs se cargan por script (scripts/import-skus-erp*.js); aquí
// solo se consultan. `highlightSku` resalta la variante encontrada al buscar
// por SKU desde la lista de productos.
export default function SkusErpTabla({ product, colorOptionId, highlightSku }) {
  const [q, setQ] = useState('');
  const hiRef = useRef(null);
  const hi = highlightSku ? String(highlightSku).toUpperCase() : '';

  const rows = useMemo(() => {
    const list = (product?.variants || []).map((v) => {
      const vals = (v.optionValues || []).filter((o) => o && typeof o === 'object');
      const color = colorOptionId ? vals.find((o) => idOf(o.option) === colorOptionId) : vals[0];
      const talla = vals.find((o) => o !== color);
      return { v, color, talla, erp: v.skusErp || [] };
    });
    return list.sort((a, b) =>
      (a.color?.valor || '').localeCompare(b.color?.valor || '', 'es') ||
      (a.talla?.orden ?? 0) - (b.talla?.orden ?? 0) ||
      (a.talla?.valor || '').localeCompare(b.talla?.valor || '', 'es'));
  }, [product, colorOptionId]);

  const total = rows.length;
  const conErp = rows.filter((r) => r.erp.length).length;
  const totalSkus = rows.reduce((s, r) => s + r.erp.length, 0);

  const term = q.trim().toUpperCase();
  const visibles = term
    ? rows.filter((r) => [r.v.sku, r.color?.valor, r.talla?.valor, ...r.erp.map((e) => e.sku)].some((t) => String(t || '').toUpperCase().includes(term)))
    : rows;

  useEffect(() => {
    if (hi && hiRef.current) hiRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [hi, rows.length]);

  if (total === 0) return <p className="text-sm text-gray-400">Este producto aún no tiene variantes.</p>;

  return (
    <div className="space-y-3">
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
          <thead className="bg-gray-50 text-gray-600 text-left sticky top-0">
            <tr>
              <th className="px-3 py-2 font-medium">Color</th>
              <th className="px-3 py-2 font-medium">Talla</th>
              <th className="px-3 py-2 font-medium">SKU interno</th>
              <th className="px-3 py-2 font-medium">SKU(s)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibles.map(({ v, color, talla, erp }) => {
              const esHi = hi && erp.some((e) => String(e.sku).toUpperCase() === hi);
              return (
                <tr key={v._id || v.sku} ref={esHi ? hiRef : null} className={esHi ? 'bg-yellow-50 ring-2 ring-inset ring-yellow-300' : ''}>
                  <td className="px-3 py-2 text-gray-900">{color?.valor ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-700">{talla?.valor ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-500">{v.sku}</td>
                  <td className="px-3 py-2">
                    {erp.length === 0 ? <span className="text-gray-300">—</span> : (
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
    </div>
  );
}
