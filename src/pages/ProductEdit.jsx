import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProduct, listBrands, listCategories, updateProduct, uploadImages, deleteImage } from '../api/catalog';

const SEXOS = ['unisex', 'hombre', 'mujer'];
const APLICACIONES = ['bordado', 'dtf', 'vinil', 'sublimado'];
const inputCls = 'w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500';

export default function ProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({ queryKey: ['product', id], queryFn: () => getProduct(id) });
  const { data: brandsData } = useQuery({ queryKey: ['brands'], queryFn: listBrands });
  const { data: catsData } = useQuery({ queryKey: ['categories'], queryFn: listCategories });
  const brands = brandsData?.data ?? [];
  const categories = catsData?.data ?? [];

  const [form, setForm] = useState(null);
  const [variants, setVariants] = useState([]);
  const [saving, setSaving] = useState(false);
  const [busyImg, setBusyImg] = useState(false);
  const [msg, setMsg] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Inicializa el formulario cuando llega el producto.
  useEffect(() => {
    const p = data?.data;
    if (!p) return;
    setForm({
      nombre: p.nombre || '', sku: p.sku || '', descripcion: p.descripcion || '',
      brand: p.brand?._id || p.brand || '', category: p.category?._id || p.category || '',
      sexo: p.sexo || 'unisex', aplicaciones: p.aplicaciones || []
    });
    setVariants((p.variants || []).map((v) => ({
      _id: v._id, color: v.color || '', colorHex: v.colorHex || '',
      tallas: (v.tallas || []).join(', '), imagenes: v.imagenes || []
    })));
  }, [data]);

  if (isLoading) return <p className="text-gray-500">Cargando producto…</p>;
  if (error) return <p className="text-red-600">Error: {error.message}</p>;
  if (!form) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleAplicacion = (a) =>
    setForm((f) => ({ ...f, aplicaciones: f.aplicaciones.includes(a) ? f.aplicaciones.filter((x) => x !== a) : [...f.aplicaciones, a] }));
  const setVariant = (i, k, v) => setVariants((vs) => vs.map((vr, idx) => (idx === i ? { ...vr, [k]: v } : vr)));
  const addVariant = () => setVariants((vs) => [...vs, { color: '', colorHex: '', tallas: '', imagenes: [] }]);
  const removeVariant = (i) => setVariants((vs) => vs.filter((_, idx) => idx !== i));

  // Recarga las variantes/imágenes desde el servidor (tras subir/borrar imagen).
  async function refetchImages() {
    const res = await getProduct(id);
    const p = res.data;
    setVariants((prev) =>
      (p.variants || []).map((v) => {
        // conserva ediciones de tallas/color en curso, actualiza solo imágenes
        const local = prev.find((x) => x._id === v._id);
        return {
          _id: v._id,
          color: local ? local.color : v.color || '',
          colorHex: local ? local.colorHex : v.colorHex || '',
          tallas: local ? local.tallas : (v.tallas || []).join(', '),
          imagenes: v.imagenes || []
        };
      })
    );
    qc.invalidateQueries({ queryKey: ['product', id] });
    qc.invalidateQueries({ queryKey: ['products'] });
  }

  async function onUpload(i, files) {
    const v = variants[i];
    if (!files.length || !v._id) return;
    setBusyImg(true); setMsg(null);
    try { await uploadImages(id, files, { variantId: v._id, color: v.color }); await refetchImages(); }
    catch (e) { setMsg({ type: 'error', text: e.message }); }
    finally { setBusyImg(false); }
  }

  async function onDeleteImage(publicId) {
    if (!confirm('¿Borrar esta imagen? (también se elimina de Cloudinary)')) return;
    setBusyImg(true); setMsg(null);
    try { await deleteImage(id, publicId); await refetchImages(); }
    catch (e) { setMsg({ type: 'error', text: e.message }); }
    finally { setBusyImg(false); }
  }

  async function onSave(e) {
    e.preventDefault();
    setMsg(null); setFieldErrors({}); setSaving(true);
    try {
      const body = {
        nombre: form.nombre,
        sku: form.sku,
        descripcion: form.descripcion || undefined,
        brand: form.brand,
        category: form.category,
        sexo: form.sexo,
        aplicaciones: form.aplicaciones,
        variants: variants.map((v) => ({
          color: v.color,
          colorHex: v.colorHex || undefined,
          tallas: v.tallas.split(',').map((t) => t.trim()).filter(Boolean),
          // Se conservan las imágenes existentes para no perderlas al actualizar la variante.
          imagenes: (v.imagenes || []).map((im) => ({
            url: im.url, public_id: im.public_id, alt: im.alt, orden: im.orden, principal: im.principal
          }))
        }))
      };
      await updateProduct(id, body);
      qc.invalidateQueries({ queryKey: ['products'] });
      navigate('/admin');
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'No se pudo guardar' });
      setFieldErrors(err.fields || {});
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Editar producto</h1>

      {msg && (
        <div className={`text-sm rounded-md px-3 py-2 mb-4 ${msg.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {msg.text}
        </div>
      )}

      <form onSubmit={onSave} className="space-y-6">
        {/* Datos */}
        <section className="bg-white rounded-lg shadow p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input className={inputCls} value={form.nombre} onChange={(e) => set('nombre', e.target.value)} required />
            {fieldErrors.nombre && <p className="text-xs text-red-600 mt-1">{fieldErrors.nombre}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
            <input className={inputCls} value={form.sku} onChange={(e) => set('sku', e.target.value)} required />
            {fieldErrors.sku && <p className="text-xs text-red-600 mt-1">{fieldErrors.sku}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sexo *</label>
            <select className={inputCls} value={form.sexo} onChange={(e) => set('sexo', e.target.value)}>
              {SEXOS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Marca *</label>
            <select className={inputCls} value={form.brand} onChange={(e) => set('brand', e.target.value)} required>
              <option value="">Selecciona…</option>
              {brands.map((b) => <option key={b._id} value={b._id}>{b.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
            <select className={inputCls} value={form.category} onChange={(e) => set('category', e.target.value)} required>
              <option value="">Selecciona…</option>
              {categories.map((c) => <option key={c._id} value={c._id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea className={inputCls} rows={3} value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Aplicaciones</label>
            <div className="flex flex-wrap gap-3">
              {APLICACIONES.map((a) => (
                <label key={a} className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={form.aplicaciones.includes(a)} onChange={() => toggleAplicacion(a)} />
                  {a}
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* Variantes + imágenes */}
        <section className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Variantes, tallas e imágenes</h2>
            <button type="button" onClick={addVariant} className="text-sm text-indigo-600 hover:text-indigo-800">+ Añadir variante</button>
          </div>
          <div className="space-y-5">
            {variants.map((v, i) => (
              <div key={v._id || `new-${i}`} className="border border-gray-200 rounded-md p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Color *</label>
                    <input className={inputCls} value={v.color} onChange={(e) => setVariant(i, 'color', e.target.value)} placeholder="Negro" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Color HEX</label>
                    <input className={inputCls} value={v.colorHex} onChange={(e) => setVariant(i, 'colorHex', e.target.value)} placeholder="#000000" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tallas (coma)</label>
                    <input className={inputCls} value={v.tallas} onChange={(e) => setVariant(i, 'tallas', e.target.value)} placeholder="S, M, L, XL" />
                  </div>
                </div>

                {/* Imágenes existentes */}
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-600 mb-2">Imágenes ({v.imagenes.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {v.imagenes.map((im) => (
                      <div key={im.public_id} className="relative group">
                        <img src={im.url} alt={im.alt || v.color} className="w-16 h-16 object-cover rounded border border-gray-200" />
                        <button
                          type="button"
                          onClick={() => onDeleteImage(im.public_id)}
                          disabled={busyImg}
                          title="Borrar imagen"
                          className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-xs leading-none flex items-center justify-center opacity-90 hover:bg-red-700"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {v.imagenes.length === 0 && <span className="text-xs text-gray-400">Sin imágenes</span>}
                  </div>

                  {/* Subir nuevas (solo variantes ya guardadas) */}
                  {v._id ? (
                    <div className="mt-2">
                      <input
                        type="file" multiple accept="image/*" disabled={busyImg}
                        onChange={(e) => { onUpload(i, Array.from(e.target.files)); e.target.value = ''; }}
                        className="text-sm"
                      />
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-amber-600">Guarda el producto primero para poder subir imágenes a esta variante nueva.</p>
                  )}
                </div>

                {variants.length > 1 && (
                  <button type="button" onClick={() => removeVariant(i)} className="mt-3 text-red-600 text-sm">Quitar variante</button>
                )}
              </div>
            ))}
          </div>
          {busyImg && <p className="text-xs text-gray-500 mt-3">Procesando imagen…</p>}
        </section>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium px-5 py-2.5 rounded-md">
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
          <button type="button" onClick={() => navigate('/admin')} className="px-5 py-2.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
