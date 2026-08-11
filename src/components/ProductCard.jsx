import { Link } from 'react-router-dom';

// Devuelve la URL de la imagen principal del producto (imagen principal de la
// primera variante que tenga imágenes).
export function mainImage(product) {
  for (const v of product.variants || []) {
    const img = v.imagenes?.find((i) => i.principal) || v.imagenes?.[0];
    if (img) return img.url;
  }
  return null;
}

export default function ProductCard({ product }) {
  const img = mainImage(product);
  const colores = (product.variants || []).length;

  return (
    <Link
      to={`/producto/${product.slug}`}
      className="group bg-white rounded-lg shadow-sm hover:shadow-md transition overflow-hidden flex flex-col"
    >
      <div className="aspect-square bg-gray-100 overflow-hidden">
        {img ? (
          <img src={img} alt={product.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">Sin imagen</div>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <p className="text-xs uppercase tracking-wide text-gray-400">{product.brand?.nombre}</p>
        <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mt-0.5">{product.nombre}</h3>
        <p className="text-xs text-gray-400 mt-auto pt-2">{colores} {colores === 1 ? 'color' : 'colores'}</p>
      </div>
    </Link>
  );
}
