import { useState } from 'react';
import { countCombos } from '../../lib/variantModel';
import { swatchBg } from '../../lib/colors';
import { inputCls } from './EditorLayout';

const chip = 'inline-flex items-center gap-1.5 text-sm font-medium bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 rounded-lg pl-3 pr-1.5 py-1';

// Convierte texto (Enter o pegado con comas/saltos) en una lista de etiquetas.
const parseSizes = (text) => text.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);

// Editor de una lista de chips de talla (base o por color).
function SizeChips({ sizes, onChange, placeholder }) {
  const [text, setText] = useState('');
  const add = (labels) => {
    const existing = new Set(sizes.map((s) => s.label.toLowerCase()));
    const nuevos = labels.filter((l) => !existing.has(l.toLowerCase())).map((l) => ({ label: l }));
    if (nuevos.length) onChange([...sizes, ...nuevos]);
  };
  const onKey = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); if (text.trim()) { add(parseSizes(text)); setText(''); } }
  };
  const onPaste = (e) => {
    const t = e.clipboardData.getData('text');
    if (/[,\n]/.test(t)) { e.preventDefault(); add(parseSizes(t)); }
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {sizes.length === 0 && <span className="text-sm text-amber-700">Aún no hay tallas.</span>}
        {sizes.map((s, i) => (
          <span key={s.valueId || s.label} className={chip}>
            {s.label}
            <button type="button" onClick={() => onChange(sizes.filter((_, idx) => idx !== i))} aria-label={`Quitar ${s.label}`}
              className="flex h-5 w-5 items-center justify-center rounded text-indigo-400 hover:bg-indigo-100 hover:text-indigo-700">×</button>
          </span>
        ))}
      </div>
      <input className={inputCls} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} onPaste={onPaste}
        placeholder={placeholder || 'Escribe una talla y Enter, o pega varias separadas por coma'} />
    </div>
  );
}

export default function SizesAndColors({ sc, onChange, sizeOptions, colorOption, valuesByOption }) {
  const set = (patch) => onChange({ ...sc, ...patch });
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [buscar, setBuscar] = useState('');

  // Presets = Opciones de tipo talla (datos). Al elegir uno, carga sus valores como tallas base.
  const applyPreset = (opt) => {
    const vals = (valuesByOption[opt._id] || []).map((v) => ({ label: v.valor, valueId: v._id }));
    set({ sizeOptionId: opt._id, baseSizes: vals });
  };
  // Id de la Opción de talla a usar al escribir tallas custom: la ya elegida,
  // o la primera disponible como respaldo. Es puro (no toca el estado) a
  // propósito: se funde en el MISMO set() que ya actualiza los chips, en vez
  // de hacer un set() aparte — dos set() seguidos en el mismo evento parten
  // del mismo `sc` capturado en el closure, así que el segundo pisa por
  // completo lo que el primero acababa de guardar (sizeOptionId se perdía
  // silenciosamente y el guardado fallaba con "option: ID inválido").
  const sizeOptionIdFor = () => sc.sizeOptionId || sizeOptions[0]?._id || '';

  const usedColorIds = new Set(sc.colors.map((c) => c.valueId).filter(Boolean));
  const usedColorLabels = new Set(sc.colors.map((c) => c.label.toLowerCase()));
  const colorSwatches = colorOption ? (valuesByOption[colorOption._id] || []) : [];
  // Búsqueda sin importar mayúsculas ni acentos ("limon" encuentra "Verde Limón").
  const sinAcentos = (t) => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const sugeridos = colorSwatches
    .filter((v) => !usedColorIds.has(v._id))
    .filter((v) => !buscar.trim() || sinAcentos(v.valor).includes(sinAcentos(buscar)));

  const addColorFromValue = (v) => { if (!usedColorIds.has(v._id)) set({ colors: [...sc.colors, { label: v.valor, hex: v.meta?.hex, valueId: v._id, override: false, sizes: [] }] }); };
  const addColorLabel = (label, hex) => { const l = label.trim(); if (l && !usedColorLabels.has(l.toLowerCase())) set({ colors: [...sc.colors, { label: l, hex, override: false, sizes: [] }] }); };
  const updateColor = (i, patch) => set({ colors: sc.colors.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) });
  const removeColor = (i) => set({ colors: sc.colors.filter((_, idx) => idx !== i) });

  const combos = countCombos(sc);

  return (
    <div className="space-y-6">
      {/* Tallas base */}
      <div className="rounded-lg border border-gray-200 p-4">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-gray-900">1 · Tallas <span className="font-normal text-gray-400">({sc.baseSizes.length})</span></h3>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {sizeOptions.length === 0 && <span className="text-xs text-amber-600">Crea una Opción de tipo Talla en Opciones</span>}
            {sizeOptions.length > 0 && <span className="text-xs text-gray-500">Cargar todas las de:</span>}
            {sizeOptions.map((o) => (
              <button key={o._id} type="button" onClick={() => applyPreset(o)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ${sc.sizeOptionId === o._id ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white text-indigo-700 ring-indigo-200 hover:bg-indigo-50'}`}>
                {o.nombre}
              </button>
            ))}
          </div>
        </div>
        <p className="mb-3 text-xs text-gray-500">Aplican a todos los colores. Escribe una talla y Enter, o pega varias separadas por coma (ej. CH, M, G, XG).</p>
        <SizeChips
          sizes={sc.baseSizes}
          onChange={(sizes) => set({ sizeOptionId: sizeOptionIdFor(), baseSizes: sizes })}
        />
      </div>

      {/* Colores */}
      <div className="rounded-lg border border-gray-200 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-gray-900">2 · Colores <span className="font-normal text-gray-400">({sc.colors.length})</span></h3>
          <span className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600">{sc.colors.length} colores × tallas = <b className="text-gray-900">{combos}</b> variantes</span>
        </div>

        {/* Colores elegidos: arriba, compactos */}
        {sc.colors.length > 0 && <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Elegidos</p>}
        {/* Tarjetas de color */}
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {sc.colors.map((c, i) => (
            <div key={c.valueId || c.label} className={`rounded-lg border border-gray-200 bg-white p-3 ${c.override ? 'md:col-span-2' : ''}`}>
              <div className="flex items-center gap-3">
                <span className="h-7 w-7 shrink-0 rounded-full ring-1 ring-black/10" style={{ background: swatchBg(c.label, c.hex) }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">{c.label}</p>
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-500">
                    <input type="checkbox" className="accent-indigo-600" checked={c.override} onChange={(e) => updateColor(i, { override: e.target.checked, sizes: e.target.checked ? (c.sizes.length ? c.sizes : sc.baseSizes) : [] })} />
                    {c.override ? `Tallas propias (${c.sizes.length})` : `Usa las ${sc.baseSizes.length} tallas`}
                  </label>
                </div>
                <button type="button" onClick={() => removeColor(i)} aria-label={`Quitar ${c.label}`}
                  className="rounded-md px-2 py-1 text-sm text-gray-400 hover:bg-red-50 hover:text-red-600">Quitar</button>
              </div>
              {c.override && (
                <div className="mt-3">
                  <SizeChips
                    sizes={c.sizes}
                    onChange={(sizes) => set({
                      sizeOptionId: sizeOptionIdFor(),
                      colors: sc.colors.map((cc, idx) => (idx === i ? { ...cc, sizes } : cc)),
                    })}
                    placeholder="Tallas para este color…"
                  />
                </div>
              )}
            </div>
          ))}
          {sc.colors.length === 0 && <p className="text-sm text-amber-700 md:col-span-2">Aún no hay colores. Búscalos abajo o pega una lista.</p>}
        </div>

        {/* Agregar colores: buscador + paleta */}
        <div className="mt-5 rounded-lg bg-gray-50 p-3 ring-1 ring-gray-200">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Agregar color</p>
            <div className="relative min-w-[12rem] flex-1">
              <input className={`${inputCls} py-2 pl-8`} value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar color… (ej. marino)" />
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">⌕</span>
            </div>
            <button type="button" onClick={() => setPasteOpen((o) => !o)} className="rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 hover:border-gray-400">
              Pegar lista
            </button>
          </div>
          <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto pr-1">
            {sugeridos.map((v) => (
                <button key={v._id} type="button" onClick={() => { addColorFromValue(v); setBuscar(''); }}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white py-1 pl-1.5 pr-3 text-sm text-gray-700 hover:border-indigo-400 hover:bg-indigo-50">
                  <span className="h-4 w-4 rounded-full ring-1 ring-black/10" style={{ background: swatchBg(v.valor, v.meta?.hex) }} />
                  {v.valor}
                </button>
              ))}
            {buscar.trim() && sugeridos.length === 0 && (
              <button type="button" onClick={() => { addColorLabel(buscar); setBuscar(''); }}
                className="rounded-full border border-dashed border-indigo-300 bg-white px-3 py-1 text-sm text-indigo-700 hover:bg-indigo-50">
                + Crear color "{buscar.trim()}"
              </button>
            )}
          </div>
        </div>

        {pasteOpen && (
          <div className="mt-3 flex gap-2">
            <input className={inputCls} value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder="Negro, Blanco, Azul marino…" />
            <button type="button" onClick={() => { parseSizes(pasteText).forEach((l) => addColorLabel(l)); setPasteText(''); setPasteOpen(false); }} className="text-sm bg-gray-100 hover:bg-gray-200 px-3 rounded-md">Añadir</button>
          </div>
        )}

        <p className="mt-2 text-xs text-gray-400">¿No está el color? Escríbelo en el buscador y usa "+ Crear color". Las fotos por color se suben en Imágenes.</p>
      </div>
    </div>
  );
}
