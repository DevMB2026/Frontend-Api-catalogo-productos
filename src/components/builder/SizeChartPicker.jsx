import { useEffect, useRef, useState } from 'react';

const inputCls = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

// Selector buscable de una sola tabla de medidas (de entre las ~48 que ya
// existen en el catálogo). A diferencia de un <select> nativo, permite
// filtrar escribiendo cualquier parte del nombre — necesario con tantas
// opciones para encontrar la correcta rápido.
export default function SizeChartPicker({ items, value, onChange, placeholder }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const selected = items.find((i) => i._id === value) || null;
  const q = query.trim().toLowerCase();
  const filtered = q ? items.filter((i) => i.nombre.toLowerCase().includes(q)) : items;

  return (
    <div className="relative" ref={ref}>
      {selected && !open ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`${inputCls} flex-1 flex items-center justify-between text-left`}
            onClick={() => { setOpen(true); setQuery(''); }}
          >
            <span className="text-gray-900">{selected.nombre}</span>
            <span className="text-xs text-indigo-600 shrink-0 ml-2">Cambiar</span>
          </button>
          <button
            type="button"
            className="text-sm text-gray-400 hover:text-red-600 px-2 py-2"
            onClick={() => onChange('')}
            title="Quitar tabla de medidas"
          >
            ✕
          </button>
        </div>
      ) : (
        <input
          className={inputCls}
          placeholder={placeholder || 'Buscar tabla de medidas… (ej. "chamarra hydro")'}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        />
      )}

      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg">
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 border-b border-gray-100"
            onClick={() => { onChange(''); setOpen(false); setQuery(''); }}
          >
            Sin tabla de medidas
          </button>
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-400">Sin resultados para "{query}".</p>
          ) : (
            filtered.map((it) => (
              <button
                key={it._id}
                type="button"
                className={`w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 ${it._id === value ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'}`}
                onClick={() => { onChange(it._id); setOpen(false); setQuery(''); }}
              >
                {it.nombre}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
