import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getProductBySlug } from '../api/catalog';

export default function ProductoDetalle() {
  const { slug } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ['product-slug', slug],
    queryFn: () => getProductBySlug(slug)
  });

  const [variantIdx, setVariantIdx] = useState(0);
  const [imgIdx, setImgIdx] = useState(0);

  if (isLoading) return <p className="text-gray-500">Cargando…</p>;
  if (error) return <p className="text-red-600">Error: {error.message}</p>;

  const p = data.data;
  const variants = p.variants || [];
  const variant = variants[variantIdx] || variants[0];
  const images = variant?.imagenes || [];
  const mainImg = images[imgIdx] || images[0];

  const selectVariant = (i) => { setVariantIdx(i); setImgIdx(0); };

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
                <button
                  key={im.public_id}
                  onClick={() => setImgIdx(i)}
                  className={`w-16 h-16 rounded border overflow-hidden ${i === imgIdx ? 'ring-2 ring-indigo-500' : 'border-gray-200'}`}
                >
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
          <p className="text-sm text-gray-500 mt-1">
            {p.category?.nombre}{p.sku ? ` · SKU ${p.sku}` : ''}
          </p>

          {p.descripcion && <p className="text-gray-700 mt-4">{p.descripcion}</p>}

          {/* Colores (variantes) */}
          {variants.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Color: <span className="font-normal">{variant?.color}</span></p>
              <div className="flex gap-2 flex-wrap">
                {variants.map((v, i) => (
                  <button
                    key={v._id || i}
                    onClick={() => selectVariant(i)}
                    title={v.color}
                    className={`w-9 h-9 rounded-full border-2 ${i === variantIdx ? 'border-indigo-600' : 'border-gray-200'}`}
                    style={{ backgroundColor: v.colorHex || '#e5e7eb' }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Tallas */}
          {variant?.tallas?.length > 0 && (
            <div className="mt-5">
              <p className="text-sm font-medium text-gray-700 mb-2">Tallas disponibles</p>
              <div className="flex gap-2 flex-wrap">
                {variant.tallas.map((t) => (
                  <span key={t} className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700">{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Aplicaciones */}
          {p.aplicaciones?.length > 0 && (
            <div className="mt-5">
              <p className="text-sm font-medium text-gray-700 mb-2">Personalización</p>
              <div className="flex gap-2 flex-wrap">
                {p.aplicaciones.map((a) => (
                  <span key={a} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs capitalize">{a}</span>
                ))}
              </div>
            </div>
          )}

          {/* Tela */}
          {p.tela && (p.tela.material || p.tela.composicion || p.tela.tipo || (p.tela.cuidados || []).length > 0) && (
            <div className="mt-6 text-sm text-gray-700">
              <p className="font-medium text-gray-900 mb-1">Tela y materiales</p>
              <ul className="space-y-0.5">
                {p.tela.material && <li>Material: {p.tela.material}</li>}
                {p.tela.composicion && <li>Composición: {p.tela.composicion}</li>}
                {p.tela.tipo && <li>Tipo: {p.tela.tipo}</li>}
                {p.tela.peso && <li>Peso: {p.tela.peso}</li>}
                {(p.tela.cuidados || []).length > 0 && <li>Cuidados: {p.tela.cuidados.join(', ')}</li>}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Tabla de medidas */}
      {p.sizeGuide?.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Tabla de medidas</h2>
          <div className="overflow-x-auto bg-white rounded-lg shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Talla</th>
                  {Object.keys(p.sizeGuide[0].medidas || {}).map((k) => (
                    <th key={k} className="px-4 py-2 font-medium capitalize">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {p.sizeGuide.map((row) => (
                  <tr key={row.talla}>
                    <td className="px-4 py-2 font-medium text-gray-900">{row.talla}</td>
                    {Object.keys(p.sizeGuide[0].medidas || {}).map((k) => (
                      <td key={k} className="px-4 py-2 text-gray-600">{row.medidas?.[k] ?? '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Preguntas frecuentes */}
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
