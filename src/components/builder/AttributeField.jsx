const inputCls = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

// Renderiza un campo de atributo según su tipo (definido por la AttributeDefinition).
export default function AttributeField({ attr, value, onChange }) {
  let control;
  switch (attr.type) {
    case 'boolean':
      control = (
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
          {value ? 'Sí' : 'No'}
        </label>
      );
      break;
    case 'number':
      control = <input type="number" className={inputCls} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} />;
      break;
    case 'select':
      control = (
        <select className={inputCls} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {(attr.options || []).map((o) => <option key={o.value} value={o.value}>{o.label || o.value}</option>)}
        </select>
      );
      break;
    case 'multiselect': {
      const arr = Array.isArray(value) ? value : [];
      control = (
        <div className="flex flex-wrap gap-2">
          {(attr.options || []).map((o) => {
            const on = arr.includes(o.value);
            return (
              <button key={o.value} type="button"
                onClick={() => onChange(on ? arr.filter((x) => x !== o.value) : [...arr, o.value])}
                className={`text-sm px-3 py-1 rounded-full border ${on ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-700 hover:border-gray-400'}`}>
                {o.label || o.value}
              </button>
            );
          })}
        </div>
      );
      break;
    }
    default:
      control = <input className={inputCls} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {attr.label}{attr.required && ' *'}
        {attr.unit && <span className="text-gray-400 font-normal"> ({attr.unit})</span>}
        {attr.heredadoDe && <span className="ml-2 text-xs bg-gray-100 text-gray-400 rounded-full px-2 py-0.5">heredado</span>}
      </label>
      {control}
    </div>
  );
}
