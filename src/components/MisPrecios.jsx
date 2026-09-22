import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMisPrecios } from '../api/privatePrice';
import { TIPOS, reglasPrecio } from '../lib/preciosReglas';

const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const idOf = (x) => (x && x._id) ? x._id : x;
const SEXO_LABEL = { mujer: 'Dama', hombre: 'Caballero', unisex: 'Unisex' };
const SEXO_CLS = { mujer: 'bg-pink-100 text-pink-700', hombre: 'bg-blue-100 text-blue-700', unisex: 'bg-gray-100 text-gray-700' };

function SkuChips({ skus }) {
  if (!skus.length) return <span className="text-gray-400">Sin SKU</span>;
  return (
    <span className="flex flex-wrap gap-x-4 gap-y-1">
      {skus.map((e) => (
        <span key={e.sku} className="inline-flex items-center gap-1.5">
          <span className="font-mono text-xs text-gray-900">{e.sku}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${SEXO_CLS[e.sexo] || SEXO_CLS.unisex}`}>{SEXO_LABEL[e.sexo] || e.sexo}</span>
        </span>
      ))}
    </span>
  );
}

// SKUs (variants[].skusErp) para clientes con acceso a precios: los de la
// variante elegida y, desplegable, la tabla de todas las variantes.
function SkusCliente({ product, variantId }) {
  const [abierto, setAbierto] = useState(false);
  const opciones = product.options || [];
  const colorOpt = opciones.find((o) => o.option?.tipo === 'swatch' || /color/i.test(o.option?.slug || '') || /color/i.test(o.option?.nombre || ''));
  const tallaOpt = opciones.find((o) => o !== colorOpt);
  const valorDe = (v, opt) => {
    if (!opt) return '';
    const ids = (v.optionValues || []).map(idOf);
    return (opt.values || []).find((x) => ids.includes(idOf(x)))?.valor || '';
  };
  const variantes = product.variants || [];
  const actual = variantes.find((v) => v._id === variantId);

  return (
    <div className="mt-4 rounded-xl ring-1 ring-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 text-sm">
        <p className="font-semibold text-gray-900 mb-1.5">
          SKU{actual && <span className="font-normal text-gray-500"> · {[valorDe(actual, colorOpt), valorDe(actual, tallaOpt)].filter(Boolean).join(' / ')}</span>}
        </p>
        {actual ? <SkuChips skus={actual.skusErp || []} /> : <span className="text-gray-400">Elige color y talla</span>}
      </div>
      {variantes.length > 1 && (
        <button type="button" onClick={() => setAbierto((a) => !a)}
          className="w-full text-left px-4 py-2 border-t border-gray-100 text-xs font-medium text-indigo-700 hover:bg-gray-50">
          {abierto ? 'Ocultar' : 'Ver'} todos los SKUs ({variantes.length} variantes)
        </button>
      )}
      {abierto && (
        <div className="max-h-80 overflow-auto border-t border-gray-100">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left sticky top-0">
              <tr>
                <th className="px-4 py-2 font-medium">Color</th>
                <th className="px-4 py-2 font-medium">Talla</th>
                <th className="px-4 py-2 font-medium">SKU(s)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {variantes.map((v) => (
                <tr key={v._id} className={v._id === variantId ? 'bg-indigo-50/60' : ''}>
                  <td className="px-4 py-2 text-gray-900">{valorDe(v, colorOpt) || '—'}</td>
                  <td className="px-4 py-2 text-gray-700">{valorDe(v, tallaOpt) || '—'}</td>
                  <td className="px-4 py-2"><SkuChips skus={v.skusErp || []} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// "Tus precios" en la ficha del producto, SOLO para una sesión iniciada. Sin
// sesión no se hace ninguna petición. Qué niveles se ven lo decide el backend
// (pricePermissions): aquí solo se muestran los que devuelve con valor. Sin
// caché entre visitas (staleTime 0, gcTime 0): un permiso quitado o una cuenta
// desactivada se nota en la siguiente ficha que se abra, y al cerrar sesión no
// queda ningún precio guardado en memoria.
export default function MisPrecios({ productId, brandSlug, product, variantId }) {
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
    <>
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
    {/* Solo llega aquí quien tiene acceso a precios (la consulta respondió OK). */}
    {product && <SkusCliente product={product} variantId={variantId} />}
    </>
  );
}
