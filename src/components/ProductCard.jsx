import { Link } from 'react-router-dom';

// Imagen principal: primero la galería del producto, luego la de alguna variante.
export function mainImage(product) {
  const pm = (product.media || []).find((i) => i.principal) || (product.media || [])[0];
  if (pm) return pm.url;
  for (const v of product.variants || []) {
    const img = (v.media || []).find((i) => i.principal) || (v.media || [])[0];
    if (img) return img.url;
  }
  return null;
}

export default function ProductCard({ product }) {
  const img = mainImage(product);
  const nVariants = (product.variants || []).length;

  return (
    <Link
      to={`/producto/${product.slug}`}
      className="group bg-white rounded-lg shadow-sm hover:shadow-md transition overflow-hidden flex flex-col"
    >
      <div className="relative aspect-[2/3] bg-gray-100 overflow-hidden">
        {product.badges?.length > 0 && (
          <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 items-start">
            {product.badges.map((b) => (
              <span key={b._id} className="bg-rose-600 text-white text-[11px] font-semibold uppercase tracking-wide px-2 py-1 rounded shadow-sm">
                {b.nombre}
              </span>
            ))}
          </div>
        )}
        {img ? (
          <img src={img} alt={product.nombre} className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">Sin imagen</div>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <p className="text-xs uppercase tracking-wide text-gray-400">{product.brand?.nombre}</p>
        <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mt-0.5">{product.nombre}</h3>
        {nVariants > 0 && <p className="text-xs text-gray-400 mt-auto pt-2">{nVariants} {nVariants === 1 ? 'variante' : 'variantes'}</p>}
      </div>
    </Link>
  );
}
