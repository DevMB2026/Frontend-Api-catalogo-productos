import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listBrands, listCategories, createProduct, updateProduct, getProduct } from '../api/catalog';
import { optionsApi, optionValuesApi, featuresApi, applicationsApi, sizeChartsApi, getAttributeSchema } from '../api/pim';
import DynamicAttributeForm from '../components/builder/DynamicAttributeForm';
import MultiSelectPicker from '../components/builder/MultiSelectPicker';
import OptionsSelector from '../components/builder/OptionsSelector';
import VariantGenerator from '../components/builder/VariantGenerator';
import MediaManager from '../components/builder/MediaManager';

const inputCls = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
const SEXOS = ['unisex', 'hombre', 'mujer'];
const idOf = (x) => (x && x._id) ? x._id : x;
const comboKey = (ids) => ids.slice().sort().join('|');

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
  const { id } = useParams();
  const isEdit = !!id;

  // Catálogos base
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

  const valueById = Object.fromEntries(values.map((v) => [v._id, v]));
  const valuesByOption = {};
  for (const v of values) { const oid = idOf(v.option); (valuesByOption[oid] = valuesByOption[oid] || []).push(v); }

  // Producto (edición)
  const { data: productData, refetch: refetchProduct } = useQuery({ queryKey: ['product', id], queryFn: () => getProduct(id), enabled: isEdit });
  const product = productData?.data;

  // Estado del builder
  const [form, setForm] = useState({ nombre: '', sku: '', descripcion: '', sexo: 'unisex', brand: '', category: '', destacado: false });
  const [attributes, setAttributes] = useState({});
  const [selFeatures, setSelFeatures] = useState([]);
  const [selApplications, setSelApplications] = useState([]);
  const [sizeChart, setSizeChart] = useState('');
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [variants, setVariants] = useState([]);
  const [productMedia, setProductMedia] = useState([]);
  const [faq, setFaq] = useState([]);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [prefilled, setPrefilled] = useState(!isEdit);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setAttr = (aid, v) => setAttributes((a) => ({ ...a, [aid]: v }));

  const { data: schemaData } = useQuery({ queryKey: ['attr-schema', form.category], queryFn: () => getAttributeSchema(form.category), enabled: !!form.category });
  const schema = form.category ? schemaData?.data : null;

  // Prefill (una vez) al cargar el producto en edición.
  useEffect(() => {
    if (!isEdit || !product || prefilled) return;
    setForm({ nombre: product.nombre, sku: product.sku, descripcion: product.descripcion || '', sexo: product.sexo || 'unisex', brand: idOf(product.brand) || '', category: idOf(product.category) || '', destacado: !!product.destacado });
    setAttributes(Object.fromEntries((product.attributes || []).map((a) => [idOf(a.attribute), a.value])));
    setSelFeatures((product.features || []).map(idOf));
    setSelApplications((product.applications || []).map(idOf));
    setSizeChart(idOf(product.sizeChart) || '');
    setSelectedOptions((product.options || []).map((o) => ({ option: idOf(o.option), values: (o.values || []).map(idOf) })));
    setVariants((product.variants || []).map((v) => {
      const ovs = (v.optionValues || []).map(idOf);
      return { key: comboKey(ovs), _id: v._id, optionValues: ovs, sku: v.sku || '', price: v.price || 0, stock: v.stock || 0, composicion: v.composicion || '', activo: v.activo !== false, media: v.media || [] };
    }));
    setProductMedia(product.media || []);
    setFaq(product.faq || []);
    setPrefilled(true);
  }, [product, isEdit, prefilled]);

  // Tras subir/borrar imágenes (refetch), re-sincroniza SOLO las imágenes.
  useEffect(() => {
    if (!isEdit || !product || !prefilled) return;
    setProductMedia(product.media || []);
    setVariants((prev) => prev.map((v) => {
      if (!v._id) return v;
      const sv = (product.variants || []).find((x) => String(x._id) === String(v._id));
      return sv ? { ...v, media: sv.media || [] } : v;
    }));
  }, [product]); // eslint-disable-line react-hooks/exhaustive-deps

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
      const payload = {
        nombre: form.nombre, sku: form.sku, descripcion: form.descripcion || undefined,
        sexo: form.sexo, brand: form.brand, category: form.category, destacado: form.destacado,
        attributes: serializeAttributes(schema, attributes),
        features: selFeatures, applications: selApplications,
        sizeChart: sizeChart || undefined,
        options: selectedOptions.filter((o) => o.values.length),
        variants: variants.filter((v) => v.activo !== false).map((v) => ({
          sku: v.sku, optionValues: v.optionValues, price: Number(v.price) || 0, stock: Number(v.stock) || 0,
          composicion: v.composicion || undefined,
          media: (v.media || []).map((m) => ({ url: m.url, public_id: m.public_id, alt: m.alt, orden: m.orden, principal: m.principal }))
        })),
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

      <Section title="Opciones de variación" desc="Elige los ejes (Color, Talla…) y qué valores usa este producto.">
        <OptionsSelector options={options} valuesByOption={valuesByOption} selected={selectedOptions} onChange={setSelectedOptions} />
      </Section>
      <Section title="Variantes" desc="Genera las combinaciones y ajusta SKU, precio, stock y composición.">
        <VariantGenerator selectedOptions={selectedOptions} valueById={valueById} baseSku={form.sku} variants={variants} onChange={setVariants} />
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
