// Editor de las opciones de un atributo select/multiselect: lista de { value, label }.
const cell = 'border border-gray-300 rounded-md px-2 py-1 text-sm w-full';

export default function OptionsEditor({ value, onChange }) {
  const rows = Array.isArray(value) ? value : [];
  const set = (i, k, v) => onChange(rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const add = () => onChange([...rows, { value: '', label: '' }]);
  const del = (i) => onChange(rows.filter((_, idx) => idx !== i));

  return (
    <div className="border border-gray-200 rounded-md p-3 space-y-2">
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs text-gray-500 font-medium">
        <span>value (interno)</span><span>label (visible)</span><span />
      </div>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
          <input className={cell} value={r.value} onChange={(e) => set(i, 'value', e.target.value)} placeholder="redondo" />
          <input className={cell} value={r.label || ''} onChange={(e) => set(i, 'label', e.target.value)} placeholder="Redondo" />
          <button type="button" onClick={() => del(i)} className="text-red-600 text-sm px-2">✕</button>
        </div>
      ))}
      <button type="button" onClick={add} className="text-sm text-indigo-600 hover:text-indigo-800">+ Añadir opción</button>
    </div>
  );
}
