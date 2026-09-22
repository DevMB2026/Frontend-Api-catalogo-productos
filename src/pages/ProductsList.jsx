import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { listProducts, deleteProduct, getProductBySku } from '../api/catalog';


// Cuenta los SKUs del ERP de un producto y en cuántas variantes están.
const erpStats = (p) => {
  const vs = p.variants || [];
  return { skus: vs.reduce((n, v) => n + (v.skusErp?.length || 0), 0), conErp: vs.filter((v) => v.skusErp?.length).length, total: vs.length };
};

export default function ProductsList() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [skuQ, setSkuQ] = useState('');
  const [skuMsg, setSkuMsg] = useState(null);
  const [skuBusy, setSkuBusy] = useState(false);
  const limit = 50;

  // Busca un SKU (del ERP, del producto o de su variante) y abre el producto
  // resaltando la variante que lo tiene.
  const buscarSku = async (e) => {
    e.preventDefault();
    const code = skuQ.trim();
    if (!code) return;
    setSkuBusy(true); setSkuMsg(null);
    try {
      const res = await getProductBySku(code);
      navigate(`/admin/productos/${res.data._id}/editar?sku=${encodeURIComponent(code)}`);
    } catch (err) {
      setSkuMsg(err.status === 404 ? `No se encontró el SKU "${code}" en el catálogo.` : (err.message || 'No se pudo buscar'));
    } finally {
      setSkuBusy(false);
    }
  };

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['products', { activo: 'all', page, limit }],
    queryFn: () => listProducts({ activo: 'all', page, limit, sort: '-createdAt' }),
    placeholderData: keepPreviousData
  });

  const del = useMutation({
    mutationFn: (id) => deleteProduct(id), // soft delete
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] })
  });

  if (isLoading) return <p className="text-gray-500">Cargando productos…</p>;
  if (error) return <p className="text-red-600">Error: {error.message}</p>;

  const products = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
          <p className="text-sm text-gray-500">{data?.pagination?.total ?? products.length} en total</p>
        </div>
        <Link to="/admin/productos/nuevo" className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-md">
          + Nuevo producto
        </Link>
      </div>

      <form onSubmit={buscarSku} className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={skuQ} onChange={(e) => { setSkuQ(e.target.value); setSkuMsg(null); }}
          placeholder="Buscar por SKU (ej. CHMPPRZM70CLNYPMARXX)"
          className="w-full sm:w-96 border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button type="submit" disabled={skuBusy || !skuQ.trim()}
          className="bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md">
          {skuBusy ? 'Buscando…' : 'Buscar SKU'}
        </button>
        {skuMsg && <span className="text-sm text-red-600">{skuMsg}</span>}
      </form>

      {products.length === 0 ? (
        <p className="text-gray-500">Aún no hay productos. Crea el primero.</p>
      ) : (
        <div className={`overflow-x-auto bg-white rounded-lg shadow ${isFetching ? 'opacity-60' : ''}`}>
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Marca</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium">Variantes</th>
                <th className="px-4 py-3 font-medium">SKUs</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p) => (
                <tr key={p._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.nombre}</td>
                  <td className="px-4 py-3 text-gray-600">{p.sku}</td>
                  <td className="px-4 py-3 text-gray-600">{p.brand?.nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{p.category?.nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{p.variants?.length ?? 0}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {(() => {
                      const st = erpStats(p);
                      return st.skus === 0 ? <span className="text-gray-300">—</span>
                        : <span title={`${st.skus} SKUs en ${st.conErp} de ${st.total} variantes`}>{st.skus} <span className="text-xs text-gray-400">({st.conErp}/{st.total} var.)</span></span>;
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${p.activo ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link to={`/admin/productos/${p._id}/editar`} className="text-indigo-600 hover:text-indigo-800 text-sm mr-4">
                      Editar
                    </Link>
                    <button
                      onClick={() => { if (confirm(`¿Desactivar "${p.nombre}"?`)) del.mutate(p._id); }}
                      disabled={del.isPending}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Desactivar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 text-sm rounded-md border border-gray-300 disabled:opacity-50 hover:bg-white"
          >
            ← Anterior
          </button>
          <span className="text-sm text-gray-600">Página {pagination.page} de {pagination.totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page >= pagination.totalPages}
            className="px-4 py-2 text-sm rounded-md border border-gray-300 disabled:opacity-50 hover:bg-white"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
