import { useState, useEffect } from 'react';
import { uploadImages, deleteImage, setImageGenero, setImageColor, reorderImages } from '../../api/catalog';
import { swatchBg } from '../../lib/colors';

const GENERO_OPTS = [
  { value: null, label: 'Ambos' },
  { value: 'hombre', label: 'Caballero' },
  { value: 'mujer', label: 'Dama' }
];

const idOf = (x) => (x && x._id) ? x._id : x;

// Gestiona imágenes de un producto ya guardado: un bloque plegable POR
// COLOR (no por talla) con su propia galería, más un bloque para la
// galería general (fotos sin color asignado). Las fotos de un color se
// suben una sola vez aquí y se comparten automáticamente entre todas sus
// tallas (ver ProductoDetalle.jsx, que resuelve la galería por color
// seleccionado). Los bloques empiezan plegados para que un producto con
// muchos colores siga siendo fácil de recorrer.
export default function MediaManager({ productId, product, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState({});
  const [dragging, setDragging] = useState(null); // { optionValue, index, groupMedia } de la foto que se está arrastrando
  const [dragOver, setDragOver] = useState(null); // { optionValue, index } sobre el que está pasando el mouse

  const necesitaGenero = (product.sexo || []).includes('hombre') && (product.sexo || []).includes('mujer');

  const colorOption = (product.options || []).find((o) =>
    o.option?.tipo === 'swatch' || /color/i.test(o.option?.slug || '') || /color/i.test(o.option?.nombre || ''));
  const colors = colorOption?.values || [];

  const media = product.media || [];
  const generalMedia = media.filter((m) => !m.optionValue);
  const mediaForColor = (colorId) => media.filter((m) => idOf(m.optionValue) === colorId);

  // Tallas ligadas a un color: se leen de las variantes ya generadas
  // (color+talla), solo para MOSTRAR qué tallas comparten esta galería —
  // aquí no se sube ni gestiona nada por talla.
  const tallasDeColor = (colorId) => (product.variants || [])
    .filter((v) => (v.optionValues || []).some((ov) => idOf(ov) === colorId))
    .map((v) => (v.optionValues || []).find((ov) => idOf(ov) !== colorId))
    .filter(Boolean)
    .map((sv) => sv.valor || sv);

  const toggle = (key) => setOpen((o) => ({ ...o, [key]: !o[key] }));

  const upload = async (files, optionValue) => {
    if (!files.length) return;
    setBusy(true); setError(null);
    try { await uploadImages(productId, files, optionValue ? { optionValue } : {}); await onChanged(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const del = async (publicId) => {
    if (!confirm('¿Borrar esta imagen? (también de Cloudinary)')) return;
    setBusy(true); setError(null);
    try { await deleteImage(productId, publicId); await onChanged(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const setGenero = async (publicId, sexo) => {
    setBusy(true); setError(null);
    try { await setImageGenero(productId, publicId, sexo); await onChanged(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  // Reasigna una foto YA subida a otro color (o a la galería general) sin
  // volver a subirla — para arreglar fotos que quedaron sueltas antes de
  // que existiera la galería por color.
  const moveColor = async (publicId, optionValue) => {
    setBusy(true); setError(null);
    try { await setImageColor(productId, publicId, optionValue); await onChanged(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  // Mueve la foto `from` a la posición `to` (arrastrar y soltar) y manda la
  // lista completa reordenada — el backend reescribe `product.media` en ese
  // orden para ese grupo (ver reorderImages).
  const reorderTo = async (groupMedia, optionValue, from, to) => {
    if (from === to) return;
    const order = groupMedia.map((m) => m.public_id);
    const [moved] = order.splice(from, 1);
    order.splice(to, 0, moved);
    setBusy(true); setError(null);
    try { await reorderImages(productId, { optionValue, publicIds: order }); await onChanged(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  // Al soltar el mouse en cualquier lugar mientras se arrastra una foto:
  // si quedó sobre otra foto del mismo grupo (dragOver), confirma el
  // reordenamiento; si no, solo cancela el arrastre.
  useEffect(() => {
    if (!dragging) return;
    const onUp = () => {
      if (dragOver && dragOver.optionValue === dragging.optionValue && dragOver.index !== dragging.index) {
        reorderTo(dragging.groupMedia, dragging.optionValue, dragging.index, dragOver.index);
      }
      setDragging(null); setDragOver(null);
    };
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, dragOver]);

  const Gallery = ({ groupMedia, optionValue }) => (
    <div className="flex flex-wrap gap-3">
      {groupMedia.map((m, i) => {
        const isDragged = dragging?.optionValue === optionValue && dragging?.index === i;
        const isOver = dragOver?.optionValue === optionValue && dragOver?.index === i && !isDragged;
        return (
          <div
            key={m.public_id}
            className={`w-16 ${isDragged ? 'opacity-40' : ''}`}
            onMouseDown={(e) => { if (busy) return; e.preventDefault(); setDragging({ optionValue, index: i, groupMedia }); }}
            onMouseEnter={() => { if (dragging && dragging.optionValue === optionValue) setDragOver({ optionValue, index: i }); }}
          >
            <div className={`relative cursor-grab active:cursor-grabbing ${isOver ? 'ring-2 ring-indigo-500 rounded' : ''}`}>
              <img src={m.url} alt={m.alt || ''} className="w-16 h-16 object-cover rounded border border-gray-200 pointer-events-none" />
              <span className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-gray-900 text-white text-[10px] leading-4 text-center">{i + 1}</span>
              <button type="button" onClick={() => del(m.public_id)} onMouseDown={(e) => e.stopPropagation()} disabled={busy}
                className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-xs leading-none flex items-center justify-center hover:bg-red-700">×</button>
            </div>
            {necesitaGenero && (
              <select
                value={m.sexo || ''}
                disabled={busy}
                onMouseDown={(e) => e.stopPropagation()}
                onChange={(e) => setGenero(m.public_id, e.target.value || null)}
                className="mt-1 w-16 text-[10px] border border-gray-300 rounded px-0.5 py-0.5 bg-white"
                title="¿Para qué género es esta foto?"
              >
                {GENERO_OPTS.map((o) => <option key={o.label} value={o.value || ''}>{o.label}</option>)}
              </select>
            )}
            <select
              value=""
              disabled={busy}
              onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) => {
                const val = e.target.value;
                if (val) moveColor(m.public_id, val === 'general' ? null : val);
                e.target.value = '';
              }}
              className="mt-1 w-16 text-[10px] border border-gray-300 rounded px-0.5 py-0.5 bg-white"
              title="Mover esta foto a otro color"
            >
              <option value="">Mover a…</option>
              {optionValue !== null && <option value="general">Galería general</option>}
              {colors.filter((c) => idOf(c) !== optionValue).map((c) => (
                <option key={idOf(c)} value={idOf(c)}>{c.valor}</option>
              ))}
            </select>
          </div>
        );
      })}
      {groupMedia.length === 0 && <span className="text-xs text-gray-400">Sin imágenes</span>}
    </div>
  );

  const Block = ({ groupKey, swatch, title, subtitle, groupMedia, optionValue, tallas }) => {
    const isOpen = !!open[groupKey];
    return (
      <div className="border border-gray-100 rounded-lg">
        <button type="button" onClick={() => toggle(groupKey)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 rounded-lg">
          {swatch && <span className="w-5 h-5 rounded-full ring-1 ring-gray-300 shrink-0" style={{ background: swatch }} />}
          <span className="text-sm font-medium text-gray-700 flex-1">{title}</span>
          <span className="text-xs text-gray-400">{groupMedia.length} foto{groupMedia.length === 1 ? '' : 's'}</span>
          <span className={`text-gray-400 text-xs transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
        </button>
        {isOpen && (
          <div className="px-3 pb-3">
            {subtitle && <p className="text-xs text-gray-400 mb-2">{subtitle}</p>}
            <Gallery groupMedia={groupMedia} optionValue={optionValue} />
            <label className={`mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border cursor-pointer select-none
              ${busy ? 'opacity-50 pointer-events-none border-gray-200 text-gray-400' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M10 3a.75.75 0 01.75.75v8.19l2.72-2.72a.75.75 0 111.06 1.06l-4 4a.75.75 0 01-1.06 0l-4-4a.75.75 0 111.06-1.06l2.72 2.72V3.75A.75.75 0 0110 3z" />
                <path d="M3.5 12.5a.75.75 0 01.75.75v2.5c0 .414.336.75.75.75h10a.75.75 0 00.75-.75v-2.5a.75.75 0 011.5 0v2.5A2.25 2.25 0 0114.5 18h-9a2.25 2.25 0 01-2.25-2.25v-2.5a.75.75 0 01.75-.75z" />
              </svg>
              Subir imágenes
              <input type="file" multiple accept="image/*" disabled={busy}
                onChange={(e) => { upload(Array.from(e.target.files), optionValue); e.target.value = ''; }} className="hidden" />
            </label>
            {tallas && tallas.length > 0 && (
              <div className="mt-2.5 pt-2.5 border-t border-gray-100 flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-gray-400">Tallas disponibles:</span>
                {tallas.map((t, i) => (
                  <span key={i} className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">{t}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2.5">
      {error && <div className="bg-red-50 text-red-700 text-sm rounded-md px-3 py-2">{error}</div>}
      {necesitaGenero && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-md px-3 py-2">
          Este producto es para hombre y mujer. Marca debajo de cada foto a quién corresponde ("Ambos" si sirve para los
          dos) — la ficha solo mostrará las fotos del género que el cliente tenga seleccionado.
        </p>
      )}

      <Block
        groupKey="general"
        title="Galería general"
        subtitle="Fotos sin color asignado (ej. de conjunto). Se muestran solo si el color elegido no tiene fotos propias."
        groupMedia={generalMedia}
        optionValue={null}
      />

      {colors.map((c) => {
        const cid = idOf(c);
        return (
          <Block
            key={cid}
            groupKey={cid}
            swatch={swatchBg(c.valor, c.meta?.hex)}
            title={c.valor}
            subtitle="Estas fotos se comparten automáticamente entre todas las tallas de este color."
            groupMedia={mediaForColor(cid)}
            optionValue={cid}
            tallas={tallasDeColor(cid)}
          />
        );
      })}

      {busy && <p className="text-xs text-gray-500">Procesando imagen…</p>}
    </div>
  );
}
