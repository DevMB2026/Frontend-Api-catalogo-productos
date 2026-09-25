import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { listAllProductsAdmin, deleteProduct, updateProduct, getProductBySku } from '../api/catalog';
import { inputCls } from '../components/builder/EditorLayout';

// Búsqueda sin importar mayúsculas ni acentos.
const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const idOf = (x) => String((x && x._id) ? x._id : x);

// Lo que le falta a un producto para estar completo en el catálogo.
function pendientesDe(p) {
  const vs = p.variants || [];
  const conSku = vs.filter((v) => v.skusErp?.length).length;
  const out = [];
  if (!p.category || /sin[- ]categor/i.test(p.category.slug || p.category.nombre || '')) out.push('Sin categoría');
  if (!(p.media || []).length) out.push('Sin fotos');
  if (!vs.length) out.push('Sin variantes');
  else if (conSku < vs.length) out.push(conSku ? `${vs.length - conSku} variantes sin SKU` : 'Sin SKUs');
  return out;
}

const fotoDe = (p) => {
  const m = (p.media || []).find((x) => x.principal) || (p.media || [])[0];
  if (!m) return null;
  // Miniatura ligera de Cloudinary cuando aplica.
  return m.url.includes('/upload/') ? m.url.replace('/upload/', '/upload/c_pad,w_120,h_120,b_white/') : m.url;
};

function Foto({ p, size = 'h-12 w-12' }) {
  const src = fotoDe(p);
  return src
    ? <img src={src} alt="" loading="lazy" className={`${size} shrink-0 rounded-lg bg-white object-contain ring-1 ring-gray-200`} />
    : <span className={`${size} flex shrink-0 items-center justify-center rounded-lg bg-gray-100 text-[10px] text-gray-400 ring-1 ring-gray-200`}>Sin foto</span>;
}

function Estado({ activo }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${activo ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-gray-100 text-gray-600 ring-1 ring-gray-200'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${activo ? 'bg-emerald-500' : 'bg-gray-400'}`} />
      {activo ? 'Activo' : 'Inactivo'}
    </span>
  );
}

export default function ProductsList() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [marca, setMarca] = useState('');
  const [categoria, setCategoria] = useState('');
  const [estado, setEstado] = useState('todos'); // todos | activos | inactivos | pendientes
  const [skuMsg, setSkuMsg] = useState(null);
  const [skuBusy, setSkuBusy] = useState(false);

  const { data: products = [], isLoading, error, isFetching } = useQuery({
    queryKey: ['products-admin-all'],
    queryFn: listAllProductsAdmin
  });

  const refrescar = () => qc.invalidateQueries({ queryKey: ['products-admin-all'] });
  const desactivar = useMutation({ mutationFn: (id) => deleteProduct(id), onSuccess: refrescar }); // soft delete
  const activar = useMutation({ mutationFn: (id) => updateProduct(id, { activo: true }), onSuccess: refrescar });

  // Opciones de filtro (a partir de los productos cargados).
  const marcas = useMemo(() => [...new Map(products.filter((p) => p.brand).map((p) => [idOf(p.brand), p.brand.nombre])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [products]);
  const categorias = useMemo(() => [...new Map(products.filter((p) => p.category).map((p) => [idOf(p.category), p.category.nombre])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [products]);

  const conteo = useMemo(() => ({
    todos: products.length,
    activos: products.filter((p) => p.activo).length,
    inactivos: products.filter((p) => !p.activo).length,
    pendientes: products.filter((p) => pendientesDe(p).length).length
  }), [products]);

  const visibles = useMemo(() => {
    const t = norm(q);
    return products.filter((p) => {
      if (marca && idOf(p.brand) !== marca) return false;
      if (categoria && idOf(p.category) !== categoria) return false;
      if (estado === 'activos' && !p.activo) return false;
      if (estado === 'inactivos' && p.activo) return false;
      if (estado === 'pendientes' && !pendientesDe(p).length) return false;
      if (!t) return true;
      return norm(p.nombre).includes(t) || norm(p.sku).includes(t)
        || (p.variants || []).some((v) => norm(v.sku).includes(t) || (v.skusErp || []).some((e) => norm(e.sku).includes(t)));
    });
  }, [products, q, marca, categoria, estado]);

  // Enter en el buscador: si no hay coincidencias en la lista, busca el texto
  // como SKU (del producto, alias o variante) y abre el producto resaltándolo.
  const buscarSku = async (e) => {
    e.preventDefault();
    const code = q.trim();
    if (!code) return;
    if (visibles.length === 1) { navigate(`/admin/productos/${visibles[0]._id}/editar`); return; }
    if (visibles.length) return;
    setSkuBusy(true); setSkuMsg(null);
    try {
      const res = await getProductBySku(code);
      navigate(`/admin/productos/${res.data._id}/editar?sku=${encodeURIComponent(code)}`);
    } catch (err) {
      setSkuMsg(err.status === 404 ? `No se encontró "${code}" ni por nombre ni por SKU.` : (err.message || 'No se pudo buscar'));
    } finally {
      setSkuBusy(false);
    }
  };

  const limpiar = () => { setQ(''); setMarca(''); setCategoria(''); setEstado('todos'); setSkuMsg(null); };
  const hayFiltros = q || marca || categoria || estado !== 'todos';

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-6 text-gray-500">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" /> Cargando productos…
      </div>
    );
  }
  if (error) return <p className="rounded-xl bg-red-50 p-4 text-red-700 ring-1 ring-red-200">Error: {error.message}</p>;

  const tarjetas = [
    { key: 'todos', label: 'Productos', n: conteo.todos, cls: 'text-gray-900' },
    { key: 'activos', label: 'Activos', n: conteo.activos, cls: 'text-emerald-700' },
    { key: 'inactivos', label: 'Inactivos', n: conteo.inactivos, cls: 'text-gray-500' },
    { key: 'pendientes', label: 'Con pendientes', n: conteo.pendientes, cls: 'text-amber-700' }
  ];

  const acciones = (p) => (
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      <Link to={`/admin/productos/${p._id}/editar`} className="rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50">Editar</Link>
      {p.activo ? (
        <button type="button" disabled={desactivar.isPending}
          onClick={() => { if (window.confirm(`¿Desactivar "${p.nombre}"?\n\nDeja de verse en el catálogo; no se borra.`)) desactivar.mutate(p._id); }}
          className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-red-50 hover:text-red-600">Desactivar</button>
      ) : (
        <button type="button" disabled={activar.isPending}
          onClick={() => { if (window.confirm(`¿Activar "${p.nombre}"?\n\nVolverá a verse en el catálogo.`)) activar.mutate(p._id); }}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50">Activar</button>
      )}
    </div>
  );

  return (
    <div>
      {/* Encabezado */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
          <p className="text-sm text-gray-500">Busca, filtra y entra a editar cualquier producto.</p>
        </div>
        <Link to="/admin/productos/nuevo" className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">
          + Nuevo producto
        </Link>
      </div>

      {/* Contadores (clic = filtrar) */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {tarjetas.map((t) => (
          <button key={t.key} type="button" onClick={() => setEstado(t.key)}
            className={`rounded-xl border bg-white px-4 py-3 text-left shadow-sm transition hover:border-indigo-300 ${estado === t.key ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-gray-200'}`}>
            <p className={`text-2xl font-bold ${t.cls}`}>{t.n}</p>
            <p className="text-xs font-medium text-gray-500">{t.label}</p>
          </button>
        ))}
      </div>

      {/* Buscador y filtros */}
      <form onSubmit={buscarSku} className="mb-4 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">⌕</span>
            <input className={`${inputCls} pl-8`} value={q} onChange={(e) => { setQ(e.target.value); setSkuMsg(null); }}
              placeholder="Buscar por nombre o SKU (Enter busca también en variantes)" />
          </div>
          <select className={inputCls} value={marca} onChange={(e) => setMarca(e.target.value)}>
            <option value="">Todas las marcas</option>
            {marcas.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
          </select>
          <select className={inputCls} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="">Todas las categorías</option>
            {categorias.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
          </select>
          <button type="button" onClick={limpiar} disabled={!hayFiltros}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40">Limpiar</button>
        </div>
        {(skuMsg || skuBusy) && <p className={`mt-2 text-sm ${skuMsg ? 'text-red-600' : 'text-gray-500'}`}>{skuBusy ? 'Buscando SKU…' : skuMsg}</p>}
      </form>

      <p className="mb-2 text-xs text-gray-500">
        {visibles.length === products.length ? `${products.length} productos` : `${visibles.length} de ${products.length} productos`}
        {isFetching && ' · actualizando…'}
      </p>

      {visibles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-gray-600">{products.length ? 'Ningún producto coincide con la búsqueda.' : 'Aún no hay productos. Crea el primero.'}</p>
          {hayFiltros && <button type="button" onClick={limpiar} className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-800">Quitar filtros</button>}
        </div>
      ) : (
        <>
          {/* Escritorio: tabla */}
          <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:block">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Producto</th>
                  <th className="px-4 py-3 font-medium">Marca · Categoría</th>
                  <th className="px-4 py-3 font-medium">Variantes</th>
                  <th className="px-4 py-3 font-medium">Pendientes</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibles.map((p) => {
                  const pend = pendientesDe(p);
                  const ocultos = (p.valoresOcultos || []).length;
                  return (
                    <tr key={p._id} onClick={() => navigate(`/admin/productos/${p._id}/editar`)} className={`cursor-pointer hover:bg-indigo-50/40 ${p.activo ? '' : 'bg-gray-50/60'}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Foto p={p} />
                          <div className="min-w-0">
                            <p className={`truncate font-medium ${p.activo ? 'text-gray-900' : 'text-gray-500'}`}>{p.nombre}</p>
                            <p className="truncate font-mono text-xs text-gray-500">{p.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-800">{p.brand?.nombre ?? '—'}</p>
                        <p className="text-xs text-gray-500">{p.category?.nombre ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                        {p.variants?.length ?? 0}
                        <span className="text-xs text-gray-400"> · {(p.media || []).length} fotos</span>
                        {ocultos > 0 && <p className="text-xs text-gray-400">{ocultos} colores ocultos</p>}
                      </td>
                      <td className="px-4 py-3">
                        {pend.length ? (
                          <div className="flex flex-wrap gap-1">
                            {pend.map((x) => <span key={x} className="rounded-md bg-amber-50 px-2 py-0.5 text-xs text-amber-800 ring-1 ring-amber-200">{x}</span>)}
                          </div>
                        ) : <span className="text-xs text-emerald-600">✓ Completo</span>}
                      </td>
                      <td className="px-4 py-3"><Estado activo={p.activo} /></td>
                      <td className="px-4 py-3">{acciones(p)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Celular: tarjetas */}
          <div className="space-y-3 md:hidden">
            {visibles.map((p) => {
              const pend = pendientesDe(p);
              return (
                <div key={p._id} onClick={() => navigate(`/admin/productos/${p._id}/editar`)} className="cursor-pointer rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                  <div className="flex gap-3">
                    <Foto p={p} size="h-16 w-16" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-medium leading-tight ${p.activo ? 'text-gray-900' : 'text-gray-500'}`}>{p.nombre}</p>
                        <Estado activo={p.activo} />
                      </div>
                      <p className="mt-0.5 truncate font-mono text-xs text-gray-500">{p.sku}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{p.brand?.nombre ?? '—'} · {p.category?.nombre ?? '—'} · {p.variants?.length ?? 0} variantes</p>
                    </div>
                  </div>
                  {pend.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {pend.map((x) => <span key={x} className="rounded-md bg-amber-50 px-2 py-0.5 text-xs text-amber-800 ring-1 ring-amber-200">{x}</span>)}
                    </div>
                  )}
                  <div className="mt-2 border-t border-gray-100 pt-2">{acciones(p)}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
