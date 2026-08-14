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

// El backend decide qué CAMPO manda (precioDistribuidor nunca viaja en el
// catálogo público), pero "el campo llegó undefined" es ambiguo por sí solo:
// puede ser "soy público" o "soy distribuidor y este producto no tiene
// precio distribuidor configurado" — en ambos casos el objeto luce igual.
// Por eso el contexto (esDistribuidor) lo pasa explícitamente la página que
// usa la tarjeta; el componente NUNCA cae de precioDistribuidor a
// precioPublico como sustituto, tal como se pidió.
function formatPrecio(product, esDistribuidor) {
  const precio = esDistribuidor ? product.precioDistribuidor : product.precioPublico;
  if (precio === undefined || precio === null) return 'Precio no disponible';
  return `$${Number(precio).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export default function ProductCard({ product, esDistribuidor = false }) {
  const img = mainImage(product);
  const nVariants = (product.variants || []).length;
  const precio = esDistribuidor ? product.precioDistribuidor : product.precioPublico;

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
        <p className={`text-sm mt-1 ${precio != null ? 'font-semibold text-gray-900' : 'text-gray-400 italic'}`}>
          {formatPrecio(product, esDistribuidor)}
        </p>
        {nVariants > 0 && <p className="text-xs text-gray-400 mt-auto pt-2">{nVariants} {nVariants === 1 ? 'variante' : 'variantes'}</p>}
      </div>
    </Link>
  );
}
