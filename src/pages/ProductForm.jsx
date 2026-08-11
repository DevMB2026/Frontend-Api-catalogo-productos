import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listBrands, listCategories, createProduct, uploadImages } from '../api/catalog';

const SEXOS = ['unisex', 'hombre', 'mujer'];
const APLICACIONES = ['bordado', 'dtf', 'vinil', 'sublimado'];

const inputCls = 'w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500';

export default function ProductForm() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: brandsData } = useQuery({ queryKey: ['brands'], queryFn: listBrands });
  const { data: catsData } = useQuery({ queryKey: ['categories'], queryFn: listCategories });
  const brands = brandsData?.data ?? [];
  const categories = catsData?.data ?? [];

  const [form, setForm] = useState({
    nombre: '', sku: '', descripcion: '', brand: '', category: '', sexo: 'unisex', aplicaciones: []
  });
  // variantes: color + tallas (coma separadas) + archivos de imagen
  const [variants, setVariants] = useState([{ color: '', colorHex: '', tallas: '', files: [] }]);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleAplicacion = (a) =>
    setForm((f) => ({ ...f, aplicaciones: f.aplicaciones.includes(a) ? f.aplicaciones.filter((x) => x !== a) : [...f.aplicaciones, a] }));

  const setVariant = (i, k, v) => setVariants((vs) => vs.map((vr, idx) => (idx === i ? { ...vr, [k]: v } : vr)));
  const addVariant = () => setVariants((vs) => [...vs, { color: '', colorHex: '', tallas: '', files: [] }]);
  const removeVariant = (i) => setVariants((vs) => vs.filter((_, idx) => idx !== i));

  const mutation = useMutation({
    mutationFn: async () => {
      // 1) construir el producto (sin imágenes)
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
          tallas: v.tallas.split(',').map((t) => t.trim()).filter(Boolean)
        }))
      };
      const res = await createProduct(body);
      const product = res.data;

      // 2) subir imágenes por variante (si las hay)
      for (const v of variants) {
        if (v.files && v.files.length > 0 && v.color) {
          await uploadImages(product._id, v.files, { color: v.color });
        }
      }
      return product;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      navigate('/admin');
    },
    onError: (err) => {
      setError(err.message || 'No se pudo crear el producto');
      setFieldErrors(err.fields || {});
    }
  });

  function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    mutation.mutate();
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Nuevo producto</h1>

      {error && <div className="bg-red-50 text-red-700 text-sm rounded-md px-3 py-2 mb-4">{error}</div>}

      <form onSubmit={onSubmit} className="space-y-6">
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
            {fieldErrors.brand && <p className="text-xs text-red-600 mt-1">{fieldErrors.brand}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
            <select className={inputCls} value={form.category} onChange={(e) => set('category', e.target.value)} required>
              <option value="">Selecciona…</option>
              {categories.map((c) => <option key={c._id} value={c._id}>{c.nombre}</option>)}
            </select>
            {fieldErrors.category && <p className="text-xs text-red-600 mt-1">{fieldErrors.category}</p>}
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

        <section className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Variantes</h2>
            <button type="button" onClick={addVariant} className="text-sm text-indigo-600 hover:text-indigo-800">+ Añadir variante</button>
          </div>
          <div className="space-y-4">
            {variants.map((v, i) => (
              <div key={i} className="border border-gray-200 rounded-md p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
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
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Imágenes</label>
                  <input type="file" multiple accept="image/*" onChange={(e) => setVariant(i, 'files', Array.from(e.target.files))} className="text-sm" />
                </div>
                {variants.length > 1 && (
                  <button type="button" onClick={() => removeVariant(i)} className="text-red-600 text-sm text-left sm:col-span-4">Quitar variante</button>
                )}
              </div>
            ))}
          </div>
        </section>

        <div className="flex gap-3">
          <button type="submit" disabled={mutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium px-5 py-2.5 rounded-md">
            {mutation.isPending ? 'Guardando…' : 'Crear producto'}
          </button>
          <button type="button" onClick={() => navigate('/admin')} className="px-5 py-2.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
