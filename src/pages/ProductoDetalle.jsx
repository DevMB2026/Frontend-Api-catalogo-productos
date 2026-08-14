import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getProductBySlug } from '../api/catalog';
import { swatchBg } from '../lib/colors';

const idOf = (x) => (x && x._id) ? x._id : x;

// Público objetivo: la DB usa hombre/mujer/unisex; se muestra en términos de tienda.
const SEXO_LABEL = { hombre: 'Caballero', mujer: 'Dama', unisex: 'Unisex' };

// Quita imágenes con URL repetida (la galería scrapeada trae duplicados).
const dedupeByUrl = (arr) => {
  const seen = new Set(); const out = [];
  for (const m of arr || []) { if (m?.url && !seen.has(m.url)) { seen.add(m.url); out.push(m); } }
  return out;
};

// Heurística de género por nombre de archivo (los datos no traen un campo de género
// por imagen, pero muchos archivos incluyen "hombre"/"mujer"/etc.).
const RE_MASC = /(^|[_\-/])(hombre|caballero|masc|men|man)([_\-/.]|$)/i;
const RE_FEM = /(^|[_\-/])(mujer|dama|fem|women|woman)([_\-/.]|$)/i;
const filterGenero = (imgs, sexo) => {
  let out = imgs;
  if (sexo === 'hombre') out = imgs.filter((m) => !RE_FEM.test(m.url));   // excluye solo-femeninas
  else if (sexo === 'mujer') out = imgs.filter((m) => !RE_MASC.test(m.url)); // excluye solo-masculinas
  return out.length ? out : imgs; // nunca dejar la galería vacía
};

// Muestra el valor de un atributo según su tipo.
function attrDisplay(a) {
  const def = a.attribute || {};
  const v = a.value;
  if (def.type === 'boolean') return v ? 'Sí' : 'No';
  if (def.type === 'multiselect') {
    const arr = Array.isArray(v) ? v : [];
    return arr.map((val) => (def.options || []).find((o) => o.value === val)?.label || val).join(', ') || '—';
  }
  if (def.type === 'select') return (def.options || []).find((o) => o.value === v)?.label || v;
  if (def.type === 'number') return `${v}${def.unit ? ' ' + def.unit : ''}`;
  return v;
}

export default function ProductoDetalle() {
  const { slug } = useParams();
  const { data, isLoading, error } = useQuery({ queryKey: ['product-slug', slug], queryFn: () => getProductBySlug(slug) });

  const [selected, setSelected] = useState({}); // optionId -> valueId
  const [selSexo, setSelSexo] = useState(null); // género seleccionado (filtro de galería)
  const [imgIdx, setImgIdx] = useState(0);

  const p = data?.data;

  // Inicializa selección (primer valor de cada eje + primer género) al cargar.
  useEffect(() => {
    if (!p) return;
    const init = {};
    for (const o of p.options || []) init[idOf(o.option)] = idOf((o.values || [])[0]);
    setSelected(init);
    setSelSexo((p.sexo || [])[0] || null);
    setImgIdx(0);
  }, [p?._id]);

  if (isLoading) return <p className="text-gray-500">Cargando…</p>;
  if (error) return <p className="text-red-600">Error: {error.message}</p>;
  if (!p) return null;

  const options = p.options || [];
  const variants = p.variants || [];
  const sexos = p.sexo || [];

  const selectedIds = options.map((o) => selected[idOf(o.option)]).filter(Boolean);
  const variant = variants.find((v) => {
    const ids = (v.optionValues || []).map(idOf);
    return ids.length === selectedIds.length && selectedIds.every((id) => ids.includes(id));
  });

  // Galería: solo las imágenes del COLOR/variante activa (desduplicadas), y filtradas
  // por el género seleccionado. Si la variante no tiene media, cae a la del producto.
  const variantMedia = dedupeByUrl((variant && variant.media) || []);
  const baseImages = variantMedia.length ? variantMedia : dedupeByUrl(p.media || []);
  const images = filterGenero(baseImages, selSexo);
  const mainImg = images[imgIdx] || images[0];

  const chooseValue = (optId, valId) => { setSelected((s) => ({ ...s, [optId]: valId })); setImgIdx(0); };
  const chooseSexo = (s) => { setSelSexo(s); setImgIdx(0); };
  const disponible = p.activo && (!variant || variant.activo !== false);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Migas */}
      <nav className="text-sm text-gray-400 mb-6 flex items-center gap-1.5">
        <Link to="/" className="hover:text-gray-700 transition-colors">Catálogo</Link>
        {p.category?.nombre && (<><span className="text-gray-300">/</span><span className="text-gray-600">{p.category.nombre}</span></>)}
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* ---------- Galería ---------- */}
        <div className="lg:sticky lg:top-6 self-start">
          <div className="aspect-square bg-gray-50 rounded-2xl overflow-hidden ring-1 ring-gray-200/70 shadow-sm">
            {mainImg ? (
              <img src={mainImg.url} alt={mainImg.alt || p.nombre} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">Sin imagen</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2.5 mt-4 flex-wrap">
              {images.map((im, i) => (
                <button key={im.public_id || im.url || i} onClick={() => setImgIdx(i)}
                  className={`w-16 h-16 rounded-xl overflow-hidden transition ${i === imgIdx ? 'ring-2 ring-indigo-600 ring-offset-2' : 'ring-1 ring-gray-200 hover:ring-gray-400'}`}>
                  <img src={im.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ---------- Info ---------- */}
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            {p.brand?.nombre && <span className="text-xs font-semibold uppercase tracking-widest text-indigo-600">{p.brand.nombre}</span>}
            {disponible && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 rounded-full px-2.5 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Disponible
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2 tracking-tight text-balance">{p.nombre}</h1>
          <p className="text-sm text-gray-400 mt-1.5">
            {p.category?.nombre}{p.sku ? <> · <span className="font-mono">SKU {p.sku}</span></> : ''}
          </p>

          {p.descripcion && (
            <p className="text-gray-600 leading-relaxed mt-5 border-l-2 border-gray-100 pl-4">{p.descripcion}</p>
          )}

          {/* Género / Público (botones interactivos, filtran la galería) */}
          {sexos.length > 0 && (
            <div className="mt-7">
              <div className="flex items-baseline gap-2 mb-3">
                <p className="text-sm font-semibold text-gray-900">Género</p>
                <span className="text-sm text-gray-500">{SEXO_LABEL[selSexo] || selSexo}</span>
              </div>
              <div className="flex gap-2.5 flex-wrap">
                {sexos.map((s) => {
                  const active = selSexo === s;
                  return (
                    <button key={s} onClick={() => chooseSexo(s)}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium transition ${active ? 'border-violet-600 bg-violet-600 text-white shadow-sm' : 'border-gray-300 text-gray-700 hover:border-gray-900'}`}>
                      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current" aria-hidden="true"><path d="M8 8a3 3 0 100-6 3 3 0 000 6zm0 1c-2.5 0-6 1.25-6 3.5V14h12v-1.5C14 10.25 10.5 9 8 9z" /></svg>
                      {SEXO_LABEL[s] || s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selectores de opción (Color / Talla) */}
          {options.map((o) => {
            const sel = (o.values || []).find((v) => idOf(v) === selected[idOf(o.option)]);
            // El eje de color siempre se dibuja como ruedita; el resto (talla) como pill.
            const isColorAxis = o.option?.tipo === 'swatch' || /color/i.test(o.option?.slug || '') || /color/i.test(o.option?.nombre || '');
            return (
              <div key={idOf(o.option)} className="mt-7">
                <div className="flex items-baseline gap-2 mb-3">
                  <p className="text-sm font-semibold text-gray-900">{o.option?.nombre}</p>
                  {sel && <span className="text-sm text-gray-500">{sel.valor}</span>}
                </div>
                <div className="flex gap-2.5 flex-wrap items-center">
                  {(o.values || []).map((val) => {
                    const active = selected[idOf(o.option)] === idOf(val);
                    if (isColorAxis) {
                      // SIEMPRE ruedita (nunca botón de texto), aunque no tenga hex.
                      return (
                        <button key={idOf(val)} onClick={() => chooseValue(idOf(o.option), idOf(val))} title={val.valor}
                          className={`w-9 h-9 rounded-full transition shrink-0 ${active ? 'ring-2 ring-indigo-600 ring-offset-2' : 'ring-1 ring-gray-300 hover:ring-gray-500'}`}
                          style={{ background: swatchBg(val.valor, val.meta?.hex) }} />
                      );
                    }
                    return (
                      <button key={idOf(val)} onClick={() => chooseValue(idOf(o.option), idOf(val))}
                        className={`min-w-[3rem] px-4 py-2 rounded-lg border text-sm font-medium transition ${active ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm' : 'border-gray-300 text-gray-700 hover:border-gray-900'}`}>
                        {val.valor}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Variante seleccionada */}
          {variant && (
            <div className="mt-7 pt-5 border-t border-gray-100 space-y-1.5">
              {variant.price > 0 && <p className="text-2xl font-bold text-gray-900">${variant.price}</p>}
              {variant.composicion && <p className="text-sm text-gray-600">Composición: {variant.composicion}</p>}
              <p className="text-xs text-gray-400 font-mono">
                SKU {variant.sku}{variant.stock > 0 ? ` · ${variant.stock} en stock` : ''}
              </p>
            </div>
          )}

          {/* Aplicaciones */}
          {p.applications?.length > 0 && (
            <div className="mt-7">
              <p className="text-sm font-semibold text-gray-900 mb-2.5">Personalización</p>
              <div className="flex gap-2 flex-wrap">
                {p.applications.map((a) => <span key={a._id} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">{a.nombre}</span>)}
              </div>
            </div>
          )}

          {/* Características */}
          {p.features?.length > 0 && (
            <div className="mt-7">
              <p className="text-sm font-semibold text-gray-900 mb-2.5">Características</p>
              <ul className="text-sm text-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                {p.features.map((f) => <li key={f._id} className="flex items-center gap-2"><span className="text-emerald-500">✓</span> {f.nombre}</li>)}
              </ul>
            </div>
          )}

          {/* Especificaciones */}
          {p.attributes?.length > 0 && (
            <div className="mt-8">
              <p className="text-sm font-semibold text-gray-900 mb-2">Especificaciones</p>
              <dl className="text-sm rounded-xl ring-1 ring-gray-100 overflow-hidden">
                {p.attributes.map((a, i) => (
                  <div key={a.attribute?._id} className={`flex justify-between gap-4 px-4 py-2.5 ${i % 2 ? 'bg-white' : 'bg-gray-50/60'}`}>
                    <dt className="text-gray-500">{a.attribute?.label}</dt>
                    <dd className="text-gray-900 text-right font-medium">{attrDisplay(a)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      {/* Tabla de medidas */}
      {p.sizeChart?.rows?.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Tabla de medidas <span className="text-sm text-gray-400 font-normal">({p.sizeChart.unidad})</span></h2>
          <div className="overflow-x-auto rounded-xl ring-1 ring-gray-200">
            <table className="min-w-full text-sm bg-white">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Talla</th>
                  {(p.sizeChart.columns || []).map((c) => <th key={c} className="px-4 py-2.5 font-medium">{c}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {p.sizeChart.rows.map((row) => (
                  <tr key={row.label}>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{row.label}</td>
                    {(p.sizeChart.columns || []).map((c, ci) => <td key={c} className="px-4 py-2.5 text-gray-600">{row.values?.[ci] ?? '—'}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* FAQ */}
      {p.faq?.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Preguntas frecuentes</h2>
          <div className="space-y-3">
            {p.faq.map((f, i) => (
              <div key={i} className="bg-white rounded-xl ring-1 ring-gray-100 p-4">
                <p className="font-medium text-gray-900">{f.pregunta}</p>
                <p className="text-sm text-gray-600 mt-1">{f.respuesta}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
