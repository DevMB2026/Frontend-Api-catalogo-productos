import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getProductBySlug } from '../api/catalog';

const idOf = (x) => (x && x._id) ? x._id : x;

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
  const [imgIdx, setImgIdx] = useState(0);

  const p = data?.data;

  // Inicializa la selección al primer valor de cada eje.
  useEffect(() => {
    if (!p) return;
    const init = {};
    for (const o of p.options || []) init[idOf(o.option)] = idOf((o.values || [])[0]);
    setSelected(init);
    setImgIdx(0);
  }, [p?._id]);

  if (isLoading) return <p className="text-gray-500">Cargando…</p>;
  if (error) return <p className="text-red-600">Error: {error.message}</p>;
  if (!p) return null;

  const options = p.options || [];
  const variants = p.variants || [];

  const selectedIds = options.map((o) => selected[idOf(o.option)]).filter(Boolean);
  const variant = variants.find((v) => {
    const ids = (v.optionValues || []).map(idOf);
    return ids.length === selectedIds.length && selectedIds.every((id) => ids.includes(id));
  });

  // Prioriza las imágenes de la variante (color) seleccionada como principal;
  // si no tiene, cae a la galería del producto. Así, al cambiar de color, el
  // hero cambia (chooseValue reinicia imgIdx a 0).
  const variantMedia = (variant && variant.media) || [];
  const images = variantMedia.length
    ? [...variantMedia, ...(p.media || [])]
    : [...(p.media || [])];
  const mainImg = images[imgIdx] || images[0];

  const chooseValue = (optId, valId) => { setSelected((s) => ({ ...s, [optId]: valId })); setImgIdx(0); };

  return (
    <div>
      <Link to="/" className="text-sm text-gray-500 hover:text-gray-900">← Volver al catálogo</Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
        {/* Galería */}
        <div>
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
            {mainImg ? (
              <img src={mainImg.url} alt={mainImg.alt || p.nombre} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">Sin imagen</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {images.map((im, i) => (
                <button key={im.public_id || i} onClick={() => setImgIdx(i)}
                  className={`w-16 h-16 rounded border overflow-hidden ${i === imgIdx ? 'ring-2 ring-indigo-500' : 'border-gray-200'}`}>
                  <img src={im.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <p className="text-sm uppercase tracking-wide text-gray-400">{p.brand?.nombre}</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{p.nombre}</h1>
          <p className="text-sm text-gray-500 mt-1">{p.category?.nombre}{p.sku ? ` · SKU ${p.sku}` : ''}</p>

          {p.descripcion && <p className="text-gray-700 mt-4">{p.descripcion}</p>}

          {/* Selectores de opción */}
          {options.map((o) => (
            <div key={idOf(o.option)} className="mt-5">
              <p className="text-sm font-medium text-gray-700 mb-2">{o.option?.nombre}</p>
              <div className="flex gap-2 flex-wrap">
                {(o.values || []).map((val) => {
                  const active = selected[idOf(o.option)] === idOf(val);
                  return (
                    <button key={idOf(val)} onClick={() => chooseValue(idOf(o.option), idOf(val))}
                      className={`px-3 py-1.5 rounded-md border text-sm inline-flex items-center gap-2 ${active ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-300 text-gray-700 hover:border-gray-400'}`}>
                      {val.meta?.hex && <span className="w-3 h-3 rounded-full border border-gray-300" style={{ background: val.meta.hex }} />}
                      {val.valor}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Variante seleccionada */}
          {variant && (
            <div className="mt-5 text-sm text-gray-700 space-y-1">
              {variant.price > 0 && <p className="text-lg font-semibold text-gray-900">${variant.price}</p>}
              {variant.composicion && <p>Composición: {variant.composicion}</p>}
              <p className="text-xs text-gray-400">SKU {variant.sku}{variant.stock > 0 ? ` · ${variant.stock} en stock` : ''}</p>
            </div>
          )}

          {/* Aplicaciones */}
          {p.applications?.length > 0 && (
            <div className="mt-5">
              <p className="text-sm font-medium text-gray-700 mb-2">Personalización</p>
              <div className="flex gap-2 flex-wrap">
                {p.applications.map((a) => <span key={a._id} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs">{a.nombre}</span>)}
              </div>
            </div>
          )}

          {/* Características */}
          {p.features?.length > 0 && (
            <div className="mt-5">
              <p className="text-sm font-medium text-gray-700 mb-2">Características</p>
              <ul className="text-sm text-gray-700 space-y-1">
                {p.features.map((f) => <li key={f._id} className="flex items-center gap-2"><span className="text-indigo-500">✓</span> {f.nombre}</li>)}
              </ul>
            </div>
          )}

          {/* Atributos (especificaciones) */}
          {p.attributes?.length > 0 && (
            <div className="mt-6">
              <p className="font-medium text-gray-900 mb-1">Especificaciones</p>
              <dl className="text-sm text-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                {p.attributes.map((a) => (
                  <div key={a.attribute?._id} className="flex justify-between border-b border-gray-100 py-1">
                    <dt className="text-gray-500">{a.attribute?.label}</dt>
                    <dd className="text-gray-900 text-right">{attrDisplay(a)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      {/* Tabla de medidas */}
      {p.sizeChart?.rows?.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Tabla de medidas <span className="text-sm text-gray-400 font-normal">({p.sizeChart.unidad})</span></h2>
          <div className="overflow-x-auto bg-white rounded-lg shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Talla</th>
                  {(p.sizeChart.columns || []).map((c) => <th key={c} className="px-4 py-2 font-medium">{c}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {p.sizeChart.rows.map((row) => (
                  <tr key={row.label}>
                    <td className="px-4 py-2 font-medium text-gray-900">{row.label}</td>
                    {(p.sizeChart.columns || []).map((c, ci) => <td key={c} className="px-4 py-2 text-gray-600">{row.values?.[ci] ?? '—'}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* FAQ */}
      {p.faq?.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Preguntas frecuentes</h2>
          <div className="space-y-3">
            {p.faq.map((f, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-4">
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
