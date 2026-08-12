import { useState } from 'react';
import { countCombos } from '../../lib/variantModel';

const chip = 'inline-flex items-center gap-1 text-sm bg-indigo-50 text-indigo-700 rounded-full pl-3 pr-2 py-1';
const inputCls = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

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
        {sizes.map((s, i) => (
          <span key={s.valueId || s.label} className={chip}>
            {s.label}
            <button type="button" onClick={() => onChange(sizes.filter((_, idx) => idx !== i))} className="text-indigo-400 hover:text-indigo-700">×</button>
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
  const [newColor, setNewColor] = useState('');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');

  // Presets = Opciones de tipo talla (datos). Al elegir uno, carga sus valores como tallas base.
  const applyPreset = (opt) => {
    const vals = (valuesByOption[opt._id] || []).map((v) => ({ label: v.valor, valueId: v._id }));
    set({ sizeOptionId: opt._id, baseSizes: vals });
  };
  // Asegura que haya una Opción de talla asociada al escribir tallas custom.
  const ensureSizeOption = () => {
    if (sc.sizeOptionId) return sc.sizeOptionId;
    const first = sizeOptions[0];
    if (first) { set({ sizeOptionId: first._id }); return first._id; }
    return '';
  };

  const usedColorIds = new Set(sc.colors.map((c) => c.valueId).filter(Boolean));
  const usedColorLabels = new Set(sc.colors.map((c) => c.label.toLowerCase()));
  const colorSwatches = colorOption ? (valuesByOption[colorOption._id] || []) : [];

  const addColorFromValue = (v) => { if (!usedColorIds.has(v._id)) set({ colors: [...sc.colors, { label: v.valor, hex: v.meta?.hex, valueId: v._id, override: false, sizes: [] }] }); };
  const addColorLabel = (label, hex) => { const l = label.trim(); if (l && !usedColorLabels.has(l.toLowerCase())) set({ colors: [...sc.colors, { label: l, hex, override: false, sizes: [] }] }); };
  const updateColor = (i, patch) => set({ colors: sc.colors.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) });
  const removeColor = (i) => set({ colors: sc.colors.filter((_, idx) => idx !== i) });

  const combos = countCombos(sc);

  return (
    <div className="space-y-6">
      {/* Tallas base */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
          <h3 className="font-medium text-gray-900">Tallas de este producto</h3>
          <div className="flex gap-2 text-sm">
            {sizeOptions.length === 0 && <span className="text-xs text-amber-600">Crea una Opción de tipo Talla en Opciones</span>}
            {sizeOptions.map((o) => (
              <button key={o._id} type="button" onClick={() => applyPreset(o)}
                className={`px-2 py-1 rounded ${sc.sizeOptionId === o._id ? 'bg-indigo-600 text-white' : 'text-indigo-600 hover:bg-indigo-50'}`}>
                {o.nombre}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-gray-500 mb-3">Se aplican a todos los colores automáticamente. Solo edítalas por color si un color tiene tallas distintas.</p>
        <SizeChips
          sizes={sc.baseSizes}
          onChange={(sizes) => { ensureSizeOption(); set({ baseSizes: sizes }); }}
        />
      </div>

      {/* Colores */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h3 className="font-medium text-gray-900">Colores <span className="text-gray-400 font-normal">({sc.colors.length})</span></h3>
          <span className="text-xs text-gray-500">{sc.colors.length} colores × tallas ≈ {combos} combinaciones</span>
        </div>

        {/* Swatches rápidos + pegar lista */}
        <div className="flex flex-wrap gap-2 mb-3">
          {colorSwatches.filter((v) => !usedColorIds.has(v._id)).map((v) => (
            <button key={v._id} type="button" onClick={() => addColorFromValue(v)}
              className="inline-flex items-center gap-2 text-sm border border-gray-300 rounded-full px-3 py-1 hover:border-gray-400">
              {v.meta?.hex && <span className="w-3.5 h-3.5 rounded-full border border-gray-300" style={{ background: v.meta.hex }} />}
              {v.valor}
            </button>
          ))}
          <button type="button" onClick={() => setPasteOpen((o) => !o)} className="text-sm border border-dashed border-gray-300 rounded-full px-3 py-1 text-gray-500 hover:border-gray-400">
            Pegar lista de colores
          </button>
        </div>
        {pasteOpen && (
          <div className="mb-3 flex gap-2">
            <input className={inputCls} value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder="Negro, Blanco, Azul marino…" />
            <button type="button" onClick={() => { parseSizes(pasteText).forEach((l) => addColorLabel(l)); setPasteText(''); setPasteOpen(false); }} className="text-sm bg-gray-100 hover:bg-gray-200 px-3 rounded-md">Añadir</button>
          </div>
        )}

        {/* Tarjetas de color */}
        <div className="space-y-2">
          {sc.colors.map((c, i) => (
            <div key={c.valueId || c.label} className="border border-gray-200 rounded-md p-3">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded border border-gray-300" style={{ background: c.hex || '#e5e7eb' }} />
                <span className="font-medium text-gray-900">{c.label}</span>
                <label className="flex items-center gap-1 text-xs text-gray-500 ml-2">
                  <input type="checkbox" checked={c.override} onChange={(e) => updateColor(i, { override: e.target.checked, sizes: e.target.checked ? (c.sizes.length ? c.sizes : sc.baseSizes) : [] })} />
                  Tallas distintas para este color
                </label>
                <div className="flex-1" />
                {!c.override && <span className="text-xs text-gray-400">Usa tallas base ({sc.baseSizes.length})</span>}
                <button type="button" onClick={() => removeColor(i)} className="text-red-600 text-sm">Quitar</button>
              </div>
              {c.override && (
                <div className="mt-3">
                  <SizeChips sizes={c.sizes} onChange={(sizes) => { ensureSizeOption(); updateColor(i, { sizes }); }} placeholder="Tallas para este color…" />
                </div>
              )}
            </div>
          ))}
          {sc.colors.length === 0 && <p className="text-sm text-gray-400">Aún no hay colores. Usa los swatches de arriba o pega una lista.</p>}
        </div>

        {/* Añadir color custom */}
        <div className="flex items-center gap-2 mt-3">
          <input className={inputCls} value={newColor} onChange={(e) => setNewColor(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addColorLabel(newColor); setNewColor(''); } }}
            placeholder="Nombre de un color nuevo…" />
          <button type="button" onClick={() => { addColorLabel(newColor); setNewColor(''); }} className="text-sm text-indigo-600 hover:text-indigo-800 whitespace-nowrap">+ Agregar color</button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Las imágenes por color/variante se gestionan al editar el producto.</p>
      </div>
    </div>
  );
}
