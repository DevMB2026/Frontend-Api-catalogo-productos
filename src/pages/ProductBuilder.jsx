import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listBrands, listCategories, createProduct, updateProduct, getProductAdmin } from '../api/catalog';
import { optionsApi, optionValuesApi, featuresApi, applicationsApi, badgesApi, sizeChartsApi, getAttributeSchema } from '../api/pim';
import { scFromProduct, scToPayload } from '../lib/variantModel';
import DynamicAttributeForm from '../components/builder/DynamicAttributeForm';
import MultiSelectPicker from '../components/builder/MultiSelectPicker';
import SizeChartPicker from '../components/builder/SizeChartPicker';
import SizesAndColors from '../components/builder/SizesAndColors';
import MediaManager from '../components/builder/MediaManager';
import VariantesManager from '../components/builder/VariantesManager';
import SkusErpTabla from '../components/builder/SkusErpTabla';
import PreciosManager from '../components/builder/PreciosManager';
import ColoresOcultos from '../components/builder/ColoresOcultos';
import { Section, SectionNav, SaveBar, inputCls, labelCls, helpCls } from '../components/builder/EditorLayout';

const SEXO_OPTS = [{ value: 'hombre', label: 'Hombre' }, { value: 'mujer', label: 'Mujer' }, { value: 'unisex', label: 'Unisex / niños' }];
const idOf = (x) => (x && x._id) ? x._id : x;

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
  const [searchParams] = useSearchParams();
  const highlightSku = searchParams.get('sku'); // viene de la búsqueda por SKU del ERP en la lista de productos
  const isEdit = !!id;

  const { data: brandsData } = useQuery({ queryKey: ['brands'], queryFn: listBrands });
  const { data: catsData } = useQuery({ queryKey: ['categories', {}], queryFn: () => listCategories() });
  const { data: optionsData } = useQuery({ queryKey: ['options'], queryFn: () => optionsApi.list() });
  const { data: valuesData } = useQuery({ queryKey: ['option-values-all'], queryFn: () => optionValuesApi.list() });
  const { data: featuresData } = useQuery({ queryKey: ['features'], queryFn: () => featuresApi.list() });
  const { data: appsData } = useQuery({ queryKey: ['applications'], queryFn: () => applicationsApi.list() });
  const { data: badgesData } = useQuery({ queryKey: ['badges'], queryFn: () => badgesApi.list() });
  const { data: sizeChartsData } = useQuery({ queryKey: ['size-charts'], queryFn: () => sizeChartsApi.list() });

  const brands = brandsData?.data ?? [];
  const categories = catsData?.data ?? [];
  const options = optionsData?.data ?? [];
  const values = valuesData?.data ?? [];
  const features = featuresData?.data ?? [];
  const applications = appsData?.data ?? [];
  const badges = badgesData?.data ?? [];
  const sizeCharts = sizeChartsData?.data ?? [];

  const valuesByOption = {};
  for (const v of values) { const oid = idOf(v.option); (valuesByOption[oid] = valuesByOption[oid] || []).push(v); }

  // Ejes: Color (swatch) y las Opciones de tipo talla (presets, data-driven).
  const colorOption = options.find((o) => o.slug === 'color') || options.find((o) => o.tipo === 'swatch');
  const colorOptionId = colorOption?._id;
  const sizeOptions = options.filter((o) => o.tipo === 'size');

  const { data: productData, refetch: refetchProduct } = useQuery({ queryKey: ['product-admin', id], queryFn: () => getProductAdmin(id), enabled: isEdit });
  const product = productData?.data;

  const [form, setForm] = useState({ nombre: '', sku: '', skuHombre: '', skuMujer: '', descripcion: '', sexo: ['unisex'], brand: '', category: '', destacado: false });
  const [attributes, setAttributes] = useState({});
  const [selFeatures, setSelFeatures] = useState([]);
  const [selApplications, setSelApplications] = useState([]);
  const [selBadges, setSelBadges] = useState([]);
  const [sizeChart, setSizeChart] = useState('');
  const [sizeChartHombre, setSizeChartHombre] = useState('');
  const [sizeChartMujer, setSizeChartMujer] = useState('');
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
      nombre: product.nombre, sku: product.sku,
      skuHombre: product.skuHombre || '', skuMujer: product.skuMujer || '',
      descripcion: product.descripcion || '',
      sexo: Array.isArray(product.sexo) ? product.sexo : (product.sexo ? [product.sexo] : ['unisex']),
      brand: idOf(product.brand) || '', category: idOf(product.category) || '', destacado: !!product.destacado
    });
    setAttributes(Object.fromEntries((product.attributes || []).map((a) => [idOf(a.attribute), a.value])));
    setSelFeatures((product.features || []).map(idOf));
    setSelApplications((product.applications || []).map(idOf));
    setSelBadges((product.badges || []).map(idOf));
    setSizeChart(idOf(product.sizeChart) || '');
    setSizeChartHombre(idOf(product.sizeChartHombre) || '');
    setSizeChartMujer(idOf(product.sizeChartMujer) || '');
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
        nombre: form.nombre, sku: form.sku,
        skuHombre: form.skuHombre || null, skuMujer: form.skuMujer || null,
        descripcion: form.descripcion || undefined,
        sexo: form.sexo, brand: form.brand, category: form.category, destacado: form.destacado,
        attributes: serializeAttributes(schema, attributes),
        features: selFeatures, applications: selApplications, badges: selBadges,
        sizeChart: sizeChart || null, // null explícito (no undefined) para que "quitar tabla" sí llegue al backend
        sizeChartHombre: sizeChartHombre || null,
        sizeChartMujer: sizeChartMujer || null,
        options: prodOptions,
        variants,
        media: productMedia.map((m) => ({
          url: m.url, public_id: m.public_id, alt: m.alt, orden: m.orden, principal: m.principal,
          optionValue: idOf(m.optionValue) || undefined, sexo: m.sexo || undefined
        })),
        faq: faq.filter((f) => f.pregunta && f.respuesta)
      };
      if (isEdit) await updateProduct(id, payload);
      else await createProduct(payload);
      inicial.current = null; // ya guardado: sin aviso de "cambios sin guardar"
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'No se pudo guardar el producto');
      setFieldErrors(err.fields || {});
    } finally {
      setSaving(false);
    }
  }

  // ---- Cambios sin guardar: se compara contra lo que había al abrir ----
  const snapshot = JSON.stringify({ form, attributes, selFeatures, selApplications, selBadges, sizeChart, sizeChartHombre, sizeChartMujer, sc, faq });
  const inicial = useRef(null);
  const [, setBaseListo] = useState(false);
  const listo = !isEdit || (prefilled && (scPrefilled || !colorOptionId));
  // Al abrir, el editor todavía ajusta algunos campos solo (atributos por
  // defecto de la categoría, tallas/colores): la "foto inicial" se toma cuando
  // todo lleva medio segundo sin cambiar, para no marcar cambios falsos.
  useEffect(() => {
    if (!listo || inicial.current !== null) return undefined;
    const t = setTimeout(() => { inicial.current = snapshot; setBaseListo(true); }, 500);
    return () => clearTimeout(t);
  }, [listo, snapshot]);
  const dirty = inicial.current !== null && inicial.current !== snapshot;
  useEffect(() => {
    if (!dirty || saving) return undefined;
    const avisar = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [dirty, saving]);
  const cancelar = () => {
    if (dirty && !window.confirm('Tienes cambios sin guardar. ¿Salir sin guardar?')) return;
    navigate('/admin');
  };

  // ---- Tallas y colores se guardan SOLOS al editar ----
  // Así un color recién agregado aparece enseguida en Imágenes (para subirle
  // fotos) y en SKUs, sin tener que presionar "Guardar cambios" primero: la
  // API solo deja subir fotos a colores que ya están guardados en el producto.
  const scRef = useRef(sc);
  scRef.current = sc;
  const scGuardado = useRef(null); // JSON del último sc guardado
  const guardandoSc = useRef(false);
  const [scEstado, setScEstado] = useState(''); // '' | 'pendiente' | 'guardando' | 'guardado' | 'error'
  const [scError, setScError] = useState(null);

  // Pasa a `actual` los ids que la API creó para colores/tallas nuevos (por
  // nombre), para no volver a crearlos en el siguiente guardado.
  const conIds = (actual, guardado) => {
    const idColor = new Map(guardado.colors.map((c) => [c.label.toLowerCase(), c.valueId]));
    const idTalla = new Map([...guardado.baseSizes, ...guardado.colors.flatMap((c) => c.sizes)].map((s) => [s.label.toLowerCase(), s.valueId]));
    const talla = (s) => (s.valueId ? s : { ...s, valueId: idTalla.get(s.label.toLowerCase()) });
    return {
      ...actual,
      sizeOptionId: actual.sizeOptionId || guardado.sizeOptionId,
      baseSizes: actual.baseSizes.map(talla),
      colors: actual.colors.map((c) => ({ ...(c.valueId ? c : { ...c, valueId: idColor.get(c.label.toLowerCase()) }), sizes: c.sizes.map(talla) })),
    };
  };

  async function guardarSc() {
    if (guardandoSc.current) { setTimeout(guardarSc, 400); return; }
    const antes = scRef.current;
    const antesTxt = JSON.stringify(antes);
    if (antesTxt === scGuardado.current) { setScEstado('guardado'); return; }
    guardandoSc.current = true;
    setScEstado('guardando'); setScError(null);
    try {
      const { options, variants } = await scToPayload(antes, form.sku, colorOptionId, createValue, product?.variants || []);
      await updateProduct(id, { options, variants });
      const r = await refetchProduct();
      const nuevo = r.data?.data ? scFromProduct(r.data.data, colorOptionId) : antes;
      scGuardado.current = JSON.stringify(nuevo);
      // Si no cambió nada mientras se guardaba, se usa lo guardado tal cual;
      // si sí, se conservan esos cambios (con los ids nuevos) y se guardan después.
      const siguiente = JSON.stringify(scRef.current) === antesTxt ? nuevo : conIds(scRef.current, nuevo);
      setSc(siguiente);
      // Lo guardado ya no cuenta como "cambios sin guardar".
      if (inicial.current) { const base = JSON.parse(inicial.current); base.sc = nuevo; inicial.current = JSON.stringify(base); }
      setScEstado('guardado');
    } catch (err) {
      scGuardado.current = antesTxt; // no reintentar en bucle; se reintenta al siguiente cambio
      setScEstado('error');
      setScError(err.message || 'No se pudo guardar');
    } finally {
      guardandoSc.current = false;
    }
  }

  useEffect(() => {
    if (!isEdit || !scPrefilled || !colorOptionId || !inicial.current) return undefined;
    const actual = JSON.stringify(sc);
    if (scGuardado.current === null) scGuardado.current = JSON.stringify(JSON.parse(inicial.current).sc);
    if (actual === scGuardado.current) return undefined;
    setScEstado('pendiente');
    const t = setTimeout(guardarSc, 900);
    return () => clearTimeout(t);
  }, [sc, isEdit, scPrefilled, colorOptionId, inicial.current]); // eslint-disable-line react-hooks/exhaustive-deps

  // Quitar un color o una talla que ya tiene variantes borra esas variantes
  // (con sus SKUs) al instante: se pide confirmación.
  const confirmarQuitarColor = (c) => {
    if (!isEdit || !c.valueId) return true;
    const vs = variantes.filter((v) => (v.optionValues || []).some((ov) => idOf(ov) === c.valueId));
    const skus = vs.reduce((t, v) => t + (v.skusErp || []).length, 0);
    const fotos = (product?.media || []).filter((m) => idOf(m.optionValue) === c.valueId).length;
    if (!vs.length && !fotos) return true;
    return window.confirm(
      `¿Quitar el color ${c.label}?\n\nSe borran sus ${vs.length} variantes${skus ? ` y ${skus} SKUs` : ''}${fotos ? ` (tiene ${fotos} fotos)` : ''}. Se guarda al instante.\n\n` +
      'Si solo quieres que no se vea en el catálogo, usa "Colores visibles en el catálogo".'
    );
  };
  const confirmarQuitarTalla = (s) => {
    if (!isEdit || !s.valueId) return true;
    const vs = variantes.filter((v) => (v.optionValues || []).some((ov) => idOf(ov) === s.valueId));
    const skus = vs.reduce((t, v) => t + (v.skusErp || []).length, 0);
    if (!vs.length) return true;
    return window.confirm(`¿Quitar la talla ${s.label}?\n\nSe borran ${vs.length} variantes${skus ? ` y ${skus} SKUs` : ''}. Se guarda al instante.`);
  };

  // ---- Estado de cada sección para el índice (verde = completo, ámbar = falta algo) ----
  const categoriaSel = categories.find((c) => c._id === form.category);
  const sinCategoria = !form.category || /sin[- ]categor/i.test(categoriaSel?.slug || categoriaSel?.nombre || '');
  const faltanDatos = [!form.nombre && 'nombre', !form.sku && 'SKU', !form.brand && 'marca', sinCategoria && 'categoría', !form.sexo.length && 'para quién'].filter(Boolean);
  const nTallas = sc.baseSizes.length + sc.colors.reduce((t, c) => t + (c.override ? c.sizes.length : 0), 0);
  const variantes = product?.variants || [];
  const sinSku = variantes.filter((v) => !(v.skusErp || []).length).length;
  const nFotos = (product?.media || []).length;
  const esDual = form.sexo.includes('hombre') && form.sexo.includes('mujer');
  const conMedidas = !!(sizeChart || sizeChartHombre || sizeChartMujer);

  const secciones = useMemo(() => {
    const it = [];
    it.push({ id: 'sec-datos', label: 'Datos básicos', status: faltanDatos.length ? 'warn' : 'ok', hint: faltanDatos.length ? `Falta: ${faltanDatos.join(', ')}` : '' });
    it.push({ id: 'sec-detalles', label: 'Atributos y detalles', status: null });
    it.push({ id: 'sec-tallas', label: 'Tallas y colores', status: !sc.colors.length || !nTallas ? 'warn' : 'ok', hint: !sc.colors.length ? 'Sin colores' : (!nTallas ? 'Sin tallas' : '') });
    if (isEdit && product) {
      it.push({ id: 'sec-visibles', label: 'Colores visibles', status: null });
      it.push({ id: 'sec-imagenes', label: 'Imágenes', status: nFotos ? 'ok' : 'warn', hint: nFotos ? '' : 'Sin fotos' });
      it.push({ id: 'sec-stock', label: 'Stock y composición', status: null });
      it.push({ id: 'sec-skus', label: 'SKUs', status: !variantes.length ? null : (sinSku ? 'warn' : 'ok'), hint: sinSku ? `${sinSku} variantes sin SKU` : '' });
      it.push({ id: 'sec-precios', label: 'Precios', status: null });
    }
    it.push({ id: 'sec-medidas', label: 'Tabla de medidas', status: conMedidas ? 'ok' : null });
    it.push({ id: 'sec-faq', label: 'Preguntas frecuentes', status: faq.length ? 'ok' : null });
    return it;
  }, [faltanDatos.join(','), sc.colors.length, nTallas, isEdit, !!product, nFotos, variantes.length, sinSku, conMedidas, faq.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isEdit && !prefilled) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-6 text-gray-500">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" /> Cargando producto…
      </div>
    );
  }

  const marcaSel = brands.find((b) => b._id === form.brand);
  let n = 0;
  const num = () => ++n;

  return (
    <form onSubmit={submit}>
      {/* Encabezado */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <button type="button" onClick={cancelar} className="mb-2 text-sm text-gray-500 hover:text-gray-800">← Productos</button>
          <h1 className="truncate text-2xl font-bold text-gray-900">{isEdit ? (form.nombre || 'Editar producto') : 'Nuevo producto'}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            {isEdit && form.sku && <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-gray-700">{form.sku}</span>}
            {marcaSel && <span className="rounded-md bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700">{marcaSel.nombre}</span>}
            {categoriaSel && !sinCategoria && <span className="rounded-md bg-gray-100 px-2 py-0.5 text-gray-700">{categoriaSel.nombre}</span>}
            {isEdit && product && <span>{variantes.length} variantes · {nFotos} fotos</span>}
            {isEdit && product && product.activo === false && <span className="rounded-md bg-red-50 px-2 py-0.5 font-medium text-red-700">Inactivo</span>}
          </div>
        </div>
        {faltanDatos.length > 0 && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">Falta: {faltanDatos.join(', ')}</p>
        )}
      </div>

      {error && (
        <div className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          <p className="font-medium">{error}</p>
          {Object.keys(fieldErrors).length > 0 && (
            <ul className="mt-1 list-disc list-inside text-xs">
              {Object.entries(fieldErrors).map(([k, v]) => <li key={k}><b>{k}</b>: {v}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <SectionNav items={secciones} />

        <div className="min-w-0 space-y-6">
          <Section id="sec-datos" n={num()} title="Datos básicos" desc="Lo mínimo para que el producto exista en el catálogo."
            status={faltanDatos.length ? 'warn' : 'ok'} statusText={faltanDatos.length ? `Falta: ${faltanDatos.join(', ')}` : ''}>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelCls}>Nombre del producto <span className="text-red-500">*</span></label>
                <input className={inputCls} value={form.nombre} onChange={(e) => set('nombre', e.target.value)} required placeholder="Ej. Chamarra Shell" />
              </div>
              <div>
                <label className={labelCls}>SKU <span className="text-red-500">*</span></label>
                <input className={`${inputCls} font-mono`} value={form.sku} onChange={(e) => set('sku', e.target.value)} required placeholder="Ej. TCHAMSHD" />
                <p className={helpCls}>Clave principal del producto. Los SKUs por color y talla van en la sección SKUs.</p>
              </div>
              <div>
                <label className={labelCls}>¿Para quién es? <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-3 gap-2">
                  {SEXO_OPTS.map(({ value, label }) => {
                    const on = form.sexo.includes(value);
                    return (
                      <button key={value} type="button" aria-pressed={on}
                        onClick={() => set('sexo', on ? form.sexo.filter((x) => x !== value) : [...form.sexo, value])}
                        className={`rounded-lg border px-2 py-2.5 text-sm font-medium transition ${on ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'}`}>
                        {label}
                      </button>
                    );
                  })}
                </div>
                <p className={helpCls}>Puedes elegir varios (ej. Hombre + Mujer).</p>
              </div>
              {esDual && (
                <>
                  <div>
                    <label className={labelCls}>SKU caballero <span className="font-normal text-gray-400">(opcional)</span></label>
                    <input className={`${inputCls} font-mono`} value={form.skuHombre} onChange={(e) => set('skuHombre', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>SKU dama <span className="font-normal text-gray-400">(opcional)</span></label>
                    <input className={`${inputCls} font-mono`} value={form.skuMujer} onChange={(e) => set('skuMujer', e.target.value)} />
                  </div>
                </>
              )}
              <div>
                <label className={labelCls}>Marca <span className="text-red-500">*</span></label>
                <select className={inputCls} value={form.brand} onChange={(e) => set('brand', e.target.value)} required>
                  <option value="">Selecciona una marca…</option>
                  {brands.map((b) => <option key={b._id} value={b._id}>{b.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Categoría <span className="text-red-500">*</span></label>
                <select className={`${inputCls} ${sinCategoria ? 'border-amber-400 ring-1 ring-amber-200' : ''}`} value={form.category} onChange={(e) => set('category', e.target.value)} required>
                  <option value="">Selecciona una categoría…</option>
                  {categories.map((c) => <option key={c._id} value={c._id}>{c.nombre}</option>)}
                </select>
                {sinCategoria && <p className="mt-1 text-xs text-amber-700">Elige una categoría: con "Sin categoría" el producto no aparece en los filtros del catálogo.</p>}
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Descripción</label>
                <textarea className={inputCls} rows={3} value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} placeholder="Texto que verá el cliente en la ficha del producto." />
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 sm:col-span-2">
                <input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={form.destacado} onChange={(e) => set('destacado', e.target.checked)} />
                <span><b className="font-medium text-gray-900">Destacado</b> — aparece en "Productos destacados" del catálogo.</span>
              </label>
            </div>
          </Section>

          <Section id="sec-detalles" n={num()} title="Atributos y detalles" desc="Clic para marcar o desmarcar. Todo se guarda con el botón de abajo.">
            <div className="space-y-6">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-800">Atributos <span className="font-normal text-gray-400">· según la categoría</span></h3>
                <DynamicAttributeForm schema={schema} values={attributes} onChange={setAttr} />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-800">Características <span className="font-normal text-gray-400">· {selFeatures.length} elegidas</span></h3>
                <MultiSelectPicker items={features} selected={selFeatures} onChange={setSelFeatures} empty="Sin características." />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-800">Aplicaciones (personalización) <span className="font-normal text-gray-400">· {selApplications.length} elegidas</span></h3>
                <MultiSelectPicker items={applications} selected={selApplications} onChange={setSelApplications} empty="Sin aplicaciones." />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-800">Etiquetas <span className="font-normal text-gray-400">· insignias sobre la tarjeta (New Arrival, Últimas piezas…)</span></h3>
                <MultiSelectPicker items={badges} selected={selBadges} onChange={setSelBadges} empty="Sin etiquetas. Créalas en Admin → Etiquetas." />
              </div>
            </div>
          </Section>

          <Section id="sec-tallas" n={num()} instant={isEdit} title="Tallas y colores"
            desc={isEdit
              ? 'Se guarda sola al agregar o quitar: un color nuevo aparece enseguida en Imágenes (para subirle fotos) y en SKUs.'
              : 'Las tallas aplican a todos los colores; las variantes (color × talla) se generan solas al crear el producto.'}
            status={!sc.colors.length || !nTallas ? 'warn' : 'ok'} statusText={!sc.colors.length ? 'Sin colores' : (!nTallas ? 'Sin tallas' : '')}>
            {isEdit && scEstado && (
              <div className={`mb-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ring-1 ${scEstado === 'error' ? 'bg-red-50 text-red-700 ring-red-200' : scEstado === 'guardado' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-sky-50 text-sky-700 ring-sky-200'}`}>
                {(scEstado === 'pendiente' || scEstado === 'guardando') && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600" />}
                {scEstado === 'pendiente' && 'Guardando cambios de tallas y colores…'}
                {scEstado === 'guardando' && 'Guardando cambios de tallas y colores…'}
                {scEstado === 'guardado' && <>✓ Guardado. Los colores ya están disponibles en <a href="#sec-imagenes" className="font-medium underline">Imágenes</a> y <a href="#sec-skus" className="font-medium underline">SKUs</a>.</>}
                {scEstado === 'error' && <>No se pudo guardar: {scError}. Vuelve a intentar con otro cambio o con "Guardar cambios".</>}
              </div>
            )}
            <SizesAndColors sc={sc} onChange={setSc} sizeOptions={sizeOptions} colorOption={colorOption} valuesByOption={valuesByOption}
              confirmarQuitarColor={confirmarQuitarColor} confirmarQuitarTalla={confirmarQuitarTalla} />
          </Section>

          {isEdit && product && (
            <Section id="sec-visibles" n={num()} instant title="Colores visibles en el catálogo" desc="Clic en un color para ocultarlo o volver a mostrarlo. Oculto = no aparece en WordPress, distribuidores ni clientes, pero NO se borra (variantes, SKUs, precios y fotos se conservan).">
              <ColoresOcultos productId={id} product={product} colorOptionId={colorOptionId} onChanged={refetchProduct} />
            </Section>
          )}

          {isEdit && product && (
            <Section id="sec-imagenes" n={num()} instant title="Imágenes" desc="Galería del producto y fotos por color." status={nFotos ? 'ok' : 'warn'} statusText={nFotos ? '' : 'Sin fotos'}>
              <MediaManager productId={id} product={product} onChanged={refetchProduct} />
            </Section>
          )}

          {isEdit && product && (
            <Section id="sec-stock" n={num()} instant title="Stock y composición" desc="Un solo valor para todas las tallas y colores.">
              <VariantesManager productId={id} product={product} onChanged={refetchProduct} />
            </Section>
          )}

          {isEdit && product && (
            <Section id="sec-skus" n={num()} instant title="SKUs" desc="SKU de cada variante color + talla (uno por género en productos dama + caballero). Tiene su propio botón de guardar."
              status={!variantes.length ? null : (sinSku ? 'warn' : 'ok')} statusText={sinSku ? `${sinSku} variantes sin SKU` : ''}>
              <SkusErpTabla productId={id} product={product} colorOptionId={colorOptionId} highlightSku={highlightSku} onChanged={refetchProduct} />
            </Section>
          )}

          {isEdit && product && (
            <Section id="sec-precios" n={num()} instant title="Precios" desc="Privados: nunca se muestran en el catálogo público. Tienen su propio botón de guardar; un campo vacío queda sin definir.">
              <PreciosManager productId={id} brandSlug={product?.brand?.slug} />
            </Section>
          )}

          <Section id="sec-medidas" n={num()} title="Tabla de medidas" desc="Si no se asigna ninguna, la ficha del producto no muestra la sección de medidas.">
            <div className="space-y-5">
              <div>
                {esDual && <p className="mb-1.5 text-xs font-medium text-gray-500">General</p>}
                <SizeChartPicker items={sizeCharts} value={sizeChart} onChange={setSizeChart} />
              </div>
              {esDual && (
                <div className="rounded-lg bg-gray-50 p-4 ring-1 ring-gray-200">
                  <p className="mb-3 text-xs text-gray-600">Este producto es para hombre y mujer. Si el corte es distinto, asigna una tabla para cada uno — la ficha mostrará la del género que el cliente elija. Si dejas alguna vacía, se usa la general.</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-gray-500">Caballero (hombre)</p>
                      <SizeChartPicker items={sizeCharts} value={sizeChartHombre} onChange={setSizeChartHombre} />
                    </div>
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-gray-500">Dama (mujer)</p>
                      <SizeChartPicker items={sizeCharts} value={sizeChartMujer} onChange={setSizeChartMujer} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Section>

          <Section id="sec-faq" n={num()} title="Preguntas frecuentes" desc="Opcional. Se muestran al final de la ficha del producto.">
            <div className="space-y-3">
              {faq.map((f, i) => (
                <div key={i} className="grid grid-cols-1 items-start gap-2 rounded-lg border border-gray-200 p-3 sm:grid-cols-[1fr_1fr_auto]">
                  <input className={inputCls} placeholder="Pregunta" value={f.pregunta} onChange={(e) => setFaq(faq.map((x, idx) => (idx === i ? { ...x, pregunta: e.target.value } : x)))} />
                  <input className={inputCls} placeholder="Respuesta" value={f.respuesta} onChange={(e) => setFaq(faq.map((x, idx) => (idx === i ? { ...x, respuesta: e.target.value } : x)))} />
                  <button type="button" onClick={() => setFaq(faq.filter((_, idx) => idx !== i))} className="rounded-lg px-3 py-2.5 text-sm text-red-600 hover:bg-red-50" aria-label="Quitar pregunta">✕</button>
                </div>
              ))}
              <button type="button" onClick={() => setFaq([...faq, { pregunta: '', respuesta: '' }])}
                className="rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50">
                + Añadir pregunta
              </button>
            </div>
          </Section>

          {!isEdit && (
            <p className="rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-800 ring-1 ring-sky-200">
              Imágenes, SKUs, stock y precios se agregan después de crear el producto (al editarlo).
            </p>
          )}
        </div>
      </div>

      <SaveBar dirty={dirty} saving={saving} isEdit={isEdit} error={error} onCancel={cancelar} />
    </form>
  );
}
