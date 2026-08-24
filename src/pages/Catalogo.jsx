import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { listProducts, listBrands, listCategories } from '../api/catalog';
import ProductCard from '../components/ProductCard';
import Hero from '../components/Hero';

const selectCls = 'border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white';

export default function Catalogo() {
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');          // texto del input
  const [search, setSearch] = useState(''); // término aplicado (al enviar)
  const [page, setPage] = useState(1);
  const limit = 12;

  const { data: brandsData } = useQuery({ queryKey: ['brands'], queryFn: listBrands });
  const { data: catsData } = useQuery({ queryKey: ['categories'], queryFn: listCategories });
  const brands = brandsData?.data ?? [];
  const categories = catsData?.data ?? [];

  const params = { page, limit };
  if (brand) params.brand = brand;
  if (category) params.category = category;
  if (search) params.q = search;

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['catalog', params],
    queryFn: () => listProducts(params),
    placeholderData: keepPreviousData
  });

  const products = data?.data ?? [];
  const pagination = data?.pagination;

  // Cambiar un filtro vuelve a la página 1.
  const onBrand = (v) => { setBrand(v); setPage(1); };
  const onCategory = (v) => { setCategory(v); setPage(1); };
  const onSearch = (e) => { e.preventDefault(); setSearch(q); setPage(1); };

  return (
    <div>
      <Hero />

      <h1 id="productos" className="text-2xl font-bold text-gray-900 mb-1 scroll-mt-20">Catálogo</h1>
      <p className="text-sm text-gray-500 mb-6">Explora los productos disponibles</p>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select className={selectCls} value={brand} onChange={(e) => onBrand(e.target.value)}>
          <option value="">Todas las marcas</option>
          {brands.map((b) => <option key={b._id} value={b.slug}>{b.nombre}</option>)}
        </select>
        <select className={selectCls} value={category} onChange={(e) => onCategory(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categories.filter((c) => !c.parent).map((c) => <option key={c._id} value={c.slug}>{c.nombre}</option>)}
        </select>
        <form onSubmit={onSearch} className="flex gap-2 flex-1 min-w-[200px]">
          <input
            className={`${selectCls} flex-1`}
            placeholder="Buscar por nombre o SKU…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 rounded-md">Buscar</button>
        </form>
        {(brand || category || search) && (
          <button
            onClick={() => { setBrand(''); setCategory(''); setQ(''); setSearch(''); setPage(1); }}
            className="text-sm text-gray-500 hover:text-gray-900 underline"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Resultados */}
      {isLoading ? (
        <p className="text-gray-500">Cargando productos…</p>
      ) : error ? (
        <p className="text-red-600">Error: {error.message}</p>
      ) : products.length === 0 ? (
        <p className="text-gray-500">No se encontraron productos con esos filtros.</p>
      ) : (
        <>
          <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 ${isFetching ? 'opacity-60' : ''}`}>
            {products.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>

          {/* Paginación */}
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
        </>
      )}
    </div>
  );
}
