import { useEffect, useState } from 'react';

// Piezas de diseño del editor de productos: sección numerada, índice lateral
// con estado por sección (scroll-spy) y barra de guardado fija abajo.

export const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500';
export const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5';
export const helpCls = 'mt-1 text-xs text-gray-500';

// Estado de una sección en el índice: 'ok' (completa), 'warn' (le falta algo)
// o null (opcional / sin evaluar).
const STATUS_DOT = {
  ok: 'bg-emerald-500',
  warn: 'bg-amber-500',
};

export function Section({ id, n, title, desc, instant, status, statusText, children }) {
  return (
    <section id={id} className="scroll-mt-24 bg-white rounded-xl border border-gray-200 shadow-sm">
      <header className="flex items-start gap-3 px-5 pt-5 pb-3 border-b border-gray-100">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700">{n}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            {instant && (
              <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-sky-200">Se guarda al instante</span>
            )}
            {status === 'warn' && statusText && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">{statusText}</span>
            )}
          </div>
          {desc && <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{desc}</p>}
        </div>
      </header>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

// Índice lateral (escritorio) / tira horizontal (celular). Resalta la sección
// visible y marca con un punto las completas (verde) o incompletas (ámbar).
export function SectionNav({ items }) {
  const [activo, setActivo] = useState(items[0]?.id);

  useEffect(() => {
    const els = items.map((it) => document.getElementById(it.id)).filter(Boolean);
    if (!els.length) return undefined;
    const io = new IntersectionObserver((entries) => {
      const visibles = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visibles[0]) setActivo(visibles[0].target.id);
    }, { rootMargin: '-20% 0px -65% 0px' });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items.map((it) => it.id).join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  const ir = (id) => (e) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActivo(id);
  };

  return (
    <>
      {/* Celular / tablet: tira horizontal fija */}
      <nav className="lg:hidden sticky top-0 z-20 -mx-4 sm:-mx-6 mb-4 border-b border-gray-200 bg-gray-50/95 px-4 sm:px-6 py-2 backdrop-blur">
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {items.map((it) => (
            <a key={it.id} href={`#${it.id}`} onClick={ir(it.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${activo === it.id ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white text-gray-700 ring-gray-200'}`}>
              {it.status && <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[it.status]}`} />}
              {it.label}
            </a>
          ))}
        </div>
      </nav>

      {/* Escritorio: índice lateral */}
      <nav className="hidden lg:block">
        <div className="sticky top-6 rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
          <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Secciones</p>
          <ul className="space-y-0.5">
            {items.map((it) => (
              <li key={it.id}>
                <a href={`#${it.id}`} onClick={ir(it.id)} title={it.hint || ''}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${activo === it.id ? 'bg-indigo-50 font-medium text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                  <span className={`h-2 w-2 shrink-0 rounded-full ${it.status ? STATUS_DOT[it.status] : 'bg-gray-200'}`} />
                  <span className="truncate">{it.label}</span>
                  {it.status === 'warn' && it.hint && <span className="ml-auto text-[10px] font-medium text-amber-600">!</span>}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-2 border-t border-gray-100 px-3 pb-1 pt-2 text-[11px] leading-relaxed text-gray-400">
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" /> completo
            <span className="ml-3 mr-1 inline-block h-2 w-2 rounded-full bg-amber-500" /> falta algo
          </div>
        </div>
      </nav>
    </>
  );
}

// Barra de guardado fija abajo: siempre a la mano, avisa si hay cambios.
export function SaveBar({ dirty, saving, isEdit, error, onCancel }) {
  return (
    <div className="sticky bottom-0 z-30 -mx-4 sm:-mx-6 mt-8 border-t border-gray-200 bg-white/95 px-4 sm:px-6 py-3 shadow-[0_-6px_20px_rgba(0,0,0,0.06)] backdrop-blur">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
          {error ? (
            <><span className="h-2 w-2 shrink-0 rounded-full bg-red-500" /><span className="truncate text-red-700">No se guardó: {error}</span></>
          ) : dirty ? (
            <><span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-500" /><span className="text-gray-700">Tienes cambios sin guardar</span></>
          ) : (
            <><span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" /><span className="text-gray-500">{isEdit ? 'Sin cambios pendientes' : 'Llena los datos y crea el producto'}</span></>
          )}
        </div>
        <button type="button" onClick={onCancel}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Cancelar
        </button>
        <button type="submit" disabled={saving}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60">
          {saving ? 'Guardando…' : (isEdit ? 'Guardar cambios' : 'Crear producto')}
        </button>
      </div>
    </div>
  );
}
