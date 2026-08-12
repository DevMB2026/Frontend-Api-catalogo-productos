// Editor de filas de una tabla de medidas. Las columnas vienen del campo
// `columns` del mismo form (string separada por comas o array).
const cell = 'border border-gray-300 rounded-md px-2 py-1 text-sm w-full';

function parseColumns(cols) {
  if (Array.isArray(cols)) return cols;
  return String(cols || '').split(',').map((s) => s.trim()).filter(Boolean);
}

export default function SizeChartRows({ value, onChange, form }) {
  const columns = parseColumns(form.columns);
  const rows = Array.isArray(value) ? value : [];

  const setLabel = (i, v) => onChange(rows.map((r, idx) => (idx === i ? { ...r, label: v } : r)));
  const setVal = (i, ci, v) => onChange(rows.map((r, idx) => {
    if (idx !== i) return r;
    const values = [...(r.values || [])];
    values[ci] = v === '' ? null : Number(v);
    return { ...r, values };
  }));
  const add = () => onChange([...rows, { label: '', values: columns.map(() => null) }]);
  const del = (i) => onChange(rows.filter((_, idx) => idx !== i));

  if (columns.length === 0) {
    return <p className="text-xs text-amber-600">Define primero las columnas para poder añadir filas.</p>;
  }

  return (
    <div className="border border-gray-200 rounded-md p-3 space-y-2 overflow-x-auto">
      <div className="flex gap-2 text-xs text-gray-500 font-medium min-w-max">
        <span className="w-20">Talla</span>
        {columns.map((c) => <span key={c} className="w-20">{c}</span>)}
        <span />
      </div>
      {rows.map((r, i) => (
        <div key={i} className="flex gap-2 items-center min-w-max">
          <input className={`${cell} w-20`} value={r.label || ''} onChange={(e) => setLabel(i, e.target.value)} placeholder="M" />
          {columns.map((c, ci) => (
            <input key={c} type="number" className={`${cell} w-20`} value={r.values?.[ci] ?? ''} onChange={(e) => setVal(i, ci, e.target.value)} />
          ))}
          <button type="button" onClick={() => del(i)} className="text-red-600 text-sm px-2">✕</button>
        </div>
      ))}
      <button type="button" onClick={add} className="text-sm text-indigo-600 hover:text-indigo-800">+ Añadir talla</button>
    </div>
  );
}
