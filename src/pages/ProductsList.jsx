import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listProducts, deleteProduct } from '../api/catalog';


export default function ProductsList() {
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['products', { activo: 'all' }],
    queryFn: () => listProducts({ activo: 'all', limit: 50, sort: '-createdAt' })
  });

  const del = useMutation({
    mutationFn: (id) => deleteProduct(id), // soft delete
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] })
  });

  if (isLoading) return <p className="text-gray-500">Cargando productos…</p>;
  if (error) return <p className="text-red-600">Error: {error.message}</p>;

  const products = data?.data ?? [];

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

      {products.length === 0 ? (
        <p className="text-gray-500">Aún no hay productos. Crea el primero.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Marca</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium">Variantes</th>
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
    </div>
  );
}
