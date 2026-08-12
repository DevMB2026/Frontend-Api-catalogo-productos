// Selector múltiple genérico (características, aplicaciones): chips seleccionables.
export default function MultiSelectPicker({ items, selected, onChange, empty }) {
  const sel = new Set(selected);
  if (!items || items.length === 0) return <p className="text-sm text-gray-400">{empty || 'Sin elementos'}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => {
        const on = sel.has(it._id);
        return (
          <button key={it._id} type="button"
            onClick={() => onChange(on ? selected.filter((x) => x !== it._id) : [...selected, it._id])}
            className={`text-sm px-3 py-1 rounded-full border ${on ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-700 hover:border-gray-400'}`}>
            {it.nombre}
          </button>
        );
      })}
    </div>
  );
}
