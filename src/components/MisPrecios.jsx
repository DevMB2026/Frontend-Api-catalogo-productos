import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMisPrecios } from '../api/privatePrice';
import { TIPOS, reglasPrecio } from '../lib/preciosReglas';

const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

// "Tus precios" en la ficha del producto, SOLO para una sesión iniciada. Sin
// sesión no se hace ninguna petición. Qué niveles se ven lo decide el backend
// (pricePermissions): aquí solo se muestran los que devuelve con valor. Sin
// caché entre visitas (staleTime 0, gcTime 0): un permiso quitado o una cuenta
// desactivada se nota en la siguiente ficha que se abra, y al cerrar sesión no
// queda ningún precio guardado en memoria.
export default function MisPrecios({ productId, brandSlug }) {
  const { isAuth, user } = useAuth();
  const { pathname } = useLocation();
  const { data, error, isLoading } = useQuery({
    queryKey: ['mis-precios', user?.id || user?._id, productId],
    queryFn: () => getMisPrecios(productId),
    enabled: isAuth && !!productId,
    staleTime: 0,
    gcTime: 0,
    retry: false
  });

  if (!isAuth || isLoading) return null;

  if (error) {
    // Sin permisos de precio (p. ej. un admin navegando el catálogo): no se muestra nada.
    if (error.status !== 401) return null;
    return (
      <div className="mt-7 rounded-xl ring-1 ring-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Tu sesión expiró o ya no tiene acceso a precios. <Link to={`/clientes?next=${encodeURIComponent(pathname)}`} className="font-medium underline">Vuelve a iniciar sesión</Link>.
      </div>
    );
  }

  const prices = data?.data?.prices || {};
  const reglas = reglasPrecio(productId, brandSlug);
  const filas = TIPOS.filter(({ key }) => prices[key] !== null && prices[key] !== undefined);

  return (
    <div className="mt-7 rounded-xl ring-1 ring-indigo-100 bg-indigo-50/40 overflow-hidden">
      <p className="px-4 pt-3 pb-2 text-sm font-semibold text-gray-900">Tus precios</p>
      {filas.length === 0 ? (
        <p className="px-4 pb-3 text-sm text-gray-600">Consulta el precio de este producto con tu asesor.</p>
      ) : (
        <>
          <dl className="text-sm">
            {filas.map(({ key, label }) => (
              <div key={key} className="flex items-baseline gap-3 px-4 py-2 border-t border-indigo-100/70">
                <dt className="text-gray-900 font-medium w-28 shrink-0">{label}</dt>
                <dd className="text-gray-500 text-xs flex-1">{reglas.rangos[key] || ''}</dd>
                <dd className="text-gray-900 font-semibold tabular-nums">{fmt.format(prices[key])}</dd>
              </div>
            ))}
          </dl>
          <p className="px-4 py-2 border-t border-indigo-100/70 text-xs text-gray-500">Precio por pieza + IVA</p>
        </>
      )}
    </div>
  );
}
