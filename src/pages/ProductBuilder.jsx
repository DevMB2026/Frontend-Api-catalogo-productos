import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listBrands, listCategories, createProduct, updateProduct, getProduct } from '../api/catalog';
import { optionsApi, optionValuesApi, featuresApi, applicationsApi, sizeChartsApi, getAttributeSchema } from '../api/pim';
import { scFromProduct, scToPayload } from '../lib/variantModel';
import DynamicAttributeForm from '../components/builder/DynamicAttributeForm';
import MultiSelectPicker from '../components/builder/MultiSelectPicker';
import SizesAndColors from '../components/builder/SizesAndColors';
import MediaManager from '../components/builder/MediaManager';

const inputCls = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
const SEXO_OPTS = [{ value: 'hombre', label: 'Hombre' }, { value: 'mujer', label: 'Mujer' }, { value: 'unisex', label: 'Unisex / niños' }];
const idOf = (x) => (x && x._id) ? x._id : x;

function Section({ title, desc, children }) {
  return (
    <section className="bg-white rounded-lg shadow p-5">
      <h2 className="font-semibold text-gray-900">{title}</h2>
      {desc && <p className="text-xs text-gray-500 mb-3">{desc}</p>}
      <div className={desc ? '' : 'mt-3'}>{children}</div>
    </section>
  );
}

function serializeAttributes(schema, values) {
  if (!schema) return [];
  return schema.attributes
    .map((a) => [a._id, values[a._id]])
    .filter(([, v]) => (Array.isArray(v) ? true : v !== undefined && v !== '' && v !== null))
    .map(([attribute, value]) => ({ attribute, value }));
}

export default function ProductBuilder() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { id } = useParams();
  const isEdit = !!id;

  const { data: brandsData } = useQuery({ queryKey: ['brands'], queryFn: listBrands });
  const { data: catsData } = useQuery({ queryKey: ['categories', {}], queryFn: () => listCategories() });
  const { data: optionsData } = useQuery({ queryKey: ['options'], queryFn: () => optionsApi.list() });
  const { data: valuesData } = useQuery({ queryKey: ['option-values-all'], queryFn: () => optionValuesApi.list() });
  const { data: featuresData } = useQuery({ queryKey: ['features'], queryFn: () => featuresApi.list() });
  const { data: appsData } = useQuery({ queryKey: ['applications'], queryFn: () => applicationsApi.list() });
  const { data: sizeChartsData } = useQuery({ queryKey: ['size-charts'], queryFn: () => sizeChartsApi.list() });

  const brands = brandsData?.data ?? [];
  const categories = catsData?.data ?? [];
  const options = optionsData?.data ?? [];
  const values = valuesData?.data ?? [];
  const features = featuresData?.data ?? [];
  const applications = appsData?.data ?? [];
  const sizeCharts = sizeChartsData?.data ?? [];

  const valuesByOption = {};
  for (const v of values) { const oid = idOf(v.option); (valuesByOption[oid] = valuesByOption[oid] || []).push(v); }

  // Ejes: Color (swatch) y las Opciones de tipo talla (presets, data-driven).
  const colorOption = options.find((o) => o.slug === 'color') || options.find((o) => o.tipo === 'swatch');
  const colorOptionId = colorOption?._id;
  const sizeOptions = options.filter((o) => o.tipo === 'size');

  const { data: productData, refetch: refetchProduct } = useQuery({ queryKey: ['product', id], queryFn: () => getProduct(id), enabled: isEdit });
  const product = productData?.data;

  const [form, setForm] = useState({ nombre: '', sku: '', descripcion: '', sexo: ['unisex'], brand: '', category: '', destacado: false });
  const [attributes, setAttributes] = useState({});
  const [selFeatures, setSelFeatures] = useState([]);
  const [selApplications, setSelApplications] = useState([]);
  const [sizeChart, setSizeChart] = useState('');
  const [sc, setSc] = useState({ sizeOptionId: '', baseSizes: [], colors: [] });
  const [productMedia, setProductMedia] = useState([]);
  const [faq, setFaq] = useState([]);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [prefilled, setPrefilled] = useState(!isEdit);
  const [scPrefilled, setScPrefilled] = useState(!isEdit);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setAttr = (aid, v) => setAttributes((a) => ({ ...a, [aid]: v }));

  // Crea un OptionValue nuevo al vuelo (talla/color tecleado) y devuelve su id.
  const createValue = async (optionId, label, meta) => {
    const r = await optionValuesApi.create({ option: optionId, valor: label, ...(meta ? { meta } : {}) });
    await qc.invalidateQueries({ queryKey: ['option-values-all'] });
    return r.data.data._id;
  };

  const { data: schemaData } = useQuery({ queryKey: ['attr-schema', form.category], queryFn: () => getAttributeSchema(form.category), enabled: !!form.category });
  const schema = form.category ? schemaData?.data : null;

  // Prefill de datos (una vez) al cargar el producto en edición.
  useEffect(() => {
    if (!isEdit || !product || prefilled) return;
    setForm({
      nombre: product.nombre, sku: product.sku, descripcion: product.descripcion || '',
      sexo: Array.isArray(product.sexo) ? product.sexo : (product.sexo ? [product.sexo] : ['unisex']),
      brand: idOf(product.brand) || '', category: idOf(product.category) || '', destacado: !!product.destacado
    });
    setAttributes(Object.fromEntries((product.attributes || []).map((a) => [idOf(a.attribute), a.value])));
    setSelFeatures((product.features || []).map(idOf));
    setSelApplications((product.applications || []).map(idOf));
    setSizeChart(idOf(product.sizeChart) || '');
    setProductMedia(product.media || []);
    setFaq(product.faq || []);
    setPrefilled(true);
  }, [product, isEdit, prefilled]);

  // Prefill de tallas/colores (necesita el id de la Opción Color).
  useEffect(() => {
    if (!isEdit || scPrefilled || !product || !colorOptionId) return;
    setSc(scFromProduct(product, colorOptionId));
    setScPrefilled(true);
  }, [isEdit, scPrefilled, product, colorOptionId]);

  // Sincroniza la galería del producto tras subir/borrar imágenes (refetch).
  useEffect(() => { if (isEdit && product) setProductMedia(product.media || []); }, [product, isEdit]);

  // Inicializa atributos a defaults SOLO cuando el usuario cambia de categoría.
  const prevCategory = useRef(null);
  useEffect(() => {
    if (!schema) return;
    if (prevCategory.current === form.category) return;
    const userChanged = prevCategory.current !== null;
    prevCategory.current = form.category;
    if (userChanged) {
      const init = {};
      for (const a of schema.attributes) init[a._id] = a.type === 'boolean' ? false : (a.type === 'multiselect' ? [] : '');
      setAttributes(init);
    } else {
      setAttributes((prev) => {
        const next = { ...prev };
        for (const a of schema.attributes) if (next[a._id] === undefined) next[a._id] = a.type === 'boolean' ? false : (a.type === 'multiselect' ? [] : '');
        return next;
      });
    }
  }, [schema, form.category]);

  async function submit(e) {
    e.preventDefault();
    setSaving(true); setError(null); setFieldErrors({});
    try {
      const { options: prodOptions, variants } = await scToPayload(sc, form.sku, colorOptionId, createValue, product?.variants || []);
      const payload = {
        nombre: form.nombre, sku: form.sku, descripcion: form.descripcion || undefined,
        sexo: form.sexo, brand: form.brand, category: form.category, destacado: form.destacado,
        attributes: serializeAttributes(schema, attributes),
        features: selFeatures, applications: selApplications,
        sizeChart: sizeChart || undefined,
        options: prodOptions,
        variants,
        media: productMedia.map((m) => ({ url: m.url, public_id: m.public_id, alt: m.alt, orden: m.orden, principal: m.principal })),
        faq: faq.filter((f) => f.pregunta && f.respuesta)
      };
      if (isEdit) await updateProduct(id, payload);
      else await createProduct(payload);
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'No se pudo guardar el producto');
      setFieldErrors(err.fields || {});
    } finally {
      setSaving(false);
    }
  }

  if (isEdit && !prefilled) return <p className="text-gray-500">Cargando producto…</p>;

  return (
    <form onSubmit={submit} className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Editar producto' : 'Nuevo producto'}</h1>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm rounded-md px-3 py-2">
          {error}
          {Object.keys(fieldErrors).length > 0 && (
            <ul className="mt-1 list-disc list-inside text-xs">
              {Object.entries(fieldErrors).map(([k, v]) => <li key={k}><b>{k}</b>: {v}</li>)}
            </ul>
          )}
        </div>
      )}

      <Section title="Datos básicos">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input className={inputCls} value={form.nombre} onChange={(e) => set('nombre', e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
            <input className={inputCls} value={form.sku} onChange={(e) => set('sku', e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">¿Para quién? *</label>
            <div className="flex gap-4 pt-2">
              {SEXO_OPTS.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={form.sexo.includes(value)}
                    onChange={(e) => set('sexo', e.target.checked ? [...form.sexo, value] : form.sexo.filter((x) => x !== value))} />
                  {label}
                </label>
              ))}
            </div>
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
            <textarea className={inputCls} rows={2} value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.destacado} onChange={(e) => set('destacado', e.target.checked)} /> Destacado
          </label>
        </div>
      </Section>

      <Section title="Atributos" desc="Se cargan según la categoría (con herencia).">
        <DynamicAttributeForm schema={schema} values={attributes} onChange={setAttr} />
      </Section>

      <Section title="Características">
        <MultiSelectPicker items={features} selected={selFeatures} onChange={setSelFeatures} empty="Sin características." />
      </Section>
      <Section title="Aplicaciones (personalización)">
        <MultiSelectPicker items={applications} selected={selApplications} onChange={setSelApplications} empty="Sin aplicaciones." />
      </Section>

      <Section title="Tallas y colores" desc="Define las tallas base (aplican a todos los colores) y los colores. Las variantes se generan solas.">
        <SizesAndColors sc={sc} onChange={setSc} sizeOptions={sizeOptions} colorOption={colorOption} valuesByOption={valuesByOption} />
      </Section>

      {isEdit && product && (
        <Section title="Imágenes" desc="Galería del producto y por variante (se guardan al instante).">
          <MediaManager productId={id} product={product} onChanged={refetchProduct} />
        </Section>
      )}

      <Section title="Tabla de medidas">
        <select className={inputCls} value={sizeChart} onChange={(e) => setSizeChart(e.target.value)}>
          <option value="">Sin tabla</option>
          {sizeCharts.map((s) => <option key={s._id} value={s._id}>{s.nombre}</option>)}
        </select>
      </Section>

      <Section title="Preguntas frecuentes">
        <div className="space-y-2">
          {faq.map((f, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-start">
              <input className={inputCls} placeholder="Pregunta" value={f.pregunta} onChange={(e) => setFaq(faq.map((x, idx) => (idx === i ? { ...x, pregunta: e.target.value } : x)))} />
              <input className={inputCls} placeholder="Respuesta" value={f.respuesta} onChange={(e) => setFaq(faq.map((x, idx) => (idx === i ? { ...x, respuesta: e.target.value } : x)))} />
              <button type="button" onClick={() => setFaq(faq.filter((_, idx) => idx !== i))} className="text-red-600 text-sm px-2 py-2">✕</button>
            </div>
          ))}
          <button type="button" onClick={() => setFaq([...faq, { pregunta: '', respuesta: '' }])} className="text-sm text-indigo-600 hover:text-indigo-800">+ Añadir pregunta</button>
        </div>
      </Section>

      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium px-5 py-2.5 rounded-md">
          {saving ? 'Guardando…' : (isEdit ? 'Guardar cambios' : 'Crear producto')}
        </button>
        <button type="button" onClick={() => navigate('/admin')} className="px-5 py-2.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">Cancelar</button>
      </div>
      {!isEdit && <p className="text-xs text-gray-400">Las imágenes se añaden después de crear el producto (en edición).</p>}
    </form>
  );
}
