const slugOf = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const cartesian = (arrays) => arrays.reduce((acc, arr) => acc.flatMap((a) => arr.map((x) => [...a, x])), [[]]);
const comboKey = (ids) => ids.slice().sort().join('|');

// Genera las variantes por combinatoria de las opciones elegidas y las hace
// editables. Al regenerar, PRESERVA las variantes ya editadas (merge por combinación).
export default function VariantGenerator({ selectedOptions, valueById, baseSku, variants, onChange }) {
  const axes = selectedOptions.filter((o) => o.values.length).map((o) => o.values);
  const posibles = axes.length ? axes.reduce((n, a) => n * a.length, 1) : 0;

  const generate = () => {
    const combos = axes.length ? cartesian(axes) : [];
    const byKey = new Map(variants.map((v) => [comboKey(v.optionValues), v]));
    const next = combos.map((c) => byKey.get(comboKey(c)) ?? {
      key: comboKey(c),
      optionValues: c,
      activo: true,
      price: 0,
      stock: 0,
      composicion: '',
      sku: `${baseSku || 'SKU'}-${c.map((id) => slugOf(valueById[id]?.valor || id)).join('-')}`.toUpperCase()
    });
    onChange(next);
  };

  const setField = (i, k, v) => onChange(variants.map((vr, idx) => (idx === i ? { ...vr, [k]: v } : vr)));

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <p className="text-sm text-gray-500">
          {posibles ? `${posibles} combinaciones posibles` : 'Selecciona opciones y sus valores para generar variantes'}
        </p>
        <button type="button" onClick={generate} disabled={!axes.length}
          className="text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 px-3 py-2 rounded-md">
          Generar / actualizar variantes
        </button>
      </div>

      {variants.length > 0 && (
        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-3 py-2">Activo</th>
                <th className="px-3 py-2">Combinación</th>
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2">Precio</th>
                <th className="px-3 py-2">Stock</th>
                <th className="px-3 py-2">Composición</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {variants.map((v, i) => (
                <tr key={v.key || i} className={v.activo === false ? 'opacity-50' : ''}>
                  <td className="px-3 py-2"><input type="checkbox" checked={v.activo !== false} onChange={(e) => setField(i, 'activo', e.target.checked)} /></td>
                  <td className="px-3 py-2 whitespace-nowrap">{v.optionValues.map((id) => valueById[id]?.valor || '?').join(' + ')}</td>
                  <td className="px-3 py-2"><input className="border border-gray-300 rounded px-2 py-1 w-44" value={v.sku} onChange={(e) => setField(i, 'sku', e.target.value)} /></td>
                  <td className="px-3 py-2"><input type="number" className="border border-gray-300 rounded px-2 py-1 w-20" value={v.price} onChange={(e) => setField(i, 'price', Number(e.target.value) || 0)} /></td>
                  <td className="px-3 py-2"><input type="number" className="border border-gray-300 rounded px-2 py-1 w-20" value={v.stock} onChange={(e) => setField(i, 'stock', Number(e.target.value) || 0)} /></td>
                  <td className="px-3 py-2"><input className="border border-gray-300 rounded px-2 py-1 w-44" value={v.composicion} onChange={(e) => setField(i, 'composicion', e.target.value)} placeholder="60% algodón…" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
