import { useState } from 'react';
import { uploadImages, deleteImage, setImageGenero } from '../../api/catalog';

const GENERO_OPTS = [
  { value: null, label: 'Ambos' },
  { value: 'hombre', label: 'Caballero' },
  { value: 'mujer', label: 'Dama' }
];

// Gestiona imágenes de un producto ya guardado: galería del producto y por
// variante. Usa los endpoints dedicados y refresca el producto tras cada cambio.
export default function MediaManager({ productId, product, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // El control de género por foto solo tiene sentido si el producto combina
  // ambos sexos en un solo documento (mismo caso que la tabla de medidas por
  // género) — para productos de un solo género, cualquier foto ya es "de ese
  // género" y el control solo estorbaría.
  const necesitaGenero = (product.sexo || []).includes('hombre') && (product.sexo || []).includes('mujer');

  const upload = async (files, variantId) => {
    if (!files.length) return;
    setBusy(true); setError(null);
    try { await uploadImages(productId, files, variantId ? { variantId } : {}); await onChanged(); }
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

  const Thumbs = ({ media }) => (
    <div className="flex flex-wrap gap-3">
      {(media || []).map((m) => (
        <div key={m.public_id} className="relative">
          <img src={m.url} alt={m.alt || ''} className="w-16 h-16 object-cover rounded border border-gray-200" />
          <button type="button" onClick={() => del(m.public_id)} disabled={busy}
            className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-xs leading-none flex items-center justify-center hover:bg-red-700">×</button>
          {necesitaGenero && (
            <select
              value={m.sexo || ''}
              disabled={busy}
              onChange={(e) => setGenero(m.public_id, e.target.value || null)}
              className="mt-1 w-16 text-[10px] border border-gray-300 rounded px-0.5 py-0.5 bg-white"
              title="¿Para qué género es esta foto?"
            >
              {GENERO_OPTS.map((o) => <option key={o.label} value={o.value || ''}>{o.label}</option>)}
            </select>
          )}
        </div>
      ))}
      {(!media || media.length === 0) && <span className="text-xs text-gray-400">Sin imágenes</span>}
    </div>
  );

  return (
    <div className="space-y-4">
      {error && <div className="bg-red-50 text-red-700 text-sm rounded-md px-3 py-2">{error}</div>}
      {necesitaGenero && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-md px-3 py-2">
          Este producto es para hombre y mujer. Marca debajo de cada foto a quién corresponde ("Ambos" si sirve para los
          dos) — la ficha solo mostrará las fotos del género que el cliente tenga seleccionado.
        </p>
      )}

      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Galería del producto</p>
        <Thumbs media={product.media} />
        <input type="file" multiple accept="image/*" disabled={busy}
          onChange={(e) => { upload(Array.from(e.target.files)); e.target.value = ''; }} className="text-sm mt-2" />
      </div>

      {(product.variants || []).map((v) => (
        <div key={v._id} className="border-t border-gray-100 pt-3">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Variante: {(v.optionValues || []).map((o) => o.valor || o).join(' + ') || v.sku}
          </p>
          <Thumbs media={v.media} />
          <input type="file" multiple accept="image/*" disabled={busy}
            onChange={(e) => { upload(Array.from(e.target.files), v._id); e.target.value = ''; }} className="text-sm mt-2" />
        </div>
      ))}

      {busy && <p className="text-xs text-gray-500">Procesando imagen…</p>}
    </div>
  );
}
