// Elige qué ejes (opciones) usa el producto y qué valores de cada uno.
// selected: [{ option: id, values: [valueId] }]
export default function OptionsSelector({ options, valuesByOption, selected, onChange }) {
  const selMap = Object.fromEntries(selected.map((s) => [s.option, s.values]));

  const toggleOption = (optId) => {
    if (selMap[optId] !== undefined) onChange(selected.filter((s) => s.option !== optId));
    else onChange([...selected, { option: optId, values: [] }]);
  };
  const toggleValue = (optId, valId) => {
    onChange(selected.map((s) => {
      if (s.option !== optId) return s;
      const on = s.values.includes(valId);
      return { ...s, values: on ? s.values.filter((v) => v !== valId) : [...s.values, valId] };
    }));
  };

  if (!options || options.length === 0) return <p className="text-sm text-gray-400">No hay opciones. Créalas en Opciones.</p>;

  return (
    <div className="space-y-3">
      {options.map((opt) => {
        const included = selMap[opt._id] !== undefined;
        const vals = valuesByOption[opt._id] || [];
        return (
          <div key={opt._id} className="border border-gray-200 rounded-md p-3">
            <label className="flex items-center gap-2 font-medium text-gray-800 text-sm">
              <input type="checkbox" checked={included} onChange={() => toggleOption(opt._id)} /> {opt.nombre}
            </label>
            {included && (
              <div className="mt-2 flex flex-wrap gap-2">
                {vals.length === 0 && <span className="text-xs text-gray-400">Sin valores. Añádelos en Opciones → Valores.</span>}
                {vals.map((v) => {
                  const on = (selMap[opt._id] || []).includes(v._id);
                  return (
                    <button key={v._id} type="button" onClick={() => toggleValue(opt._id, v._id)}
                      className={`text-sm px-3 py-1 rounded-full border inline-flex items-center gap-1 ${on ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-700 hover:border-gray-400'}`}>
                      {v.meta?.hex && <span className="w-3 h-3 rounded-full border border-white/40" style={{ background: v.meta.hex }} />}
                      {v.valor}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
