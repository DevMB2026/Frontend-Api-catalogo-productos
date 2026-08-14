import { useState } from 'react';
import { listDistributorProducts } from '../api/distributor';
import ProductCard from '../components/ProductCard';

const inputCls = 'border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white flex-1';

// Pantalla de PRUEBA para verificar el flujo real de API Key de distribuidor.
// La key vive únicamente en el estado de este componente (memoria del
// navegador, se pierde al recargar) — nunca en localStorage/sessionStorage,
// nunca en la URL, siempre viaja como header X-API-Key.
export default function DistributorAccess() {
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | error | success
  const [error, setError] = useState(null);
  const [products, setProducts] = useState([]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setStatus('error');
      setError({ message: 'Ingresa una API Key antes de consultar.', code: null });
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      const res = await listDistributorProducts(apiKey.trim());
      setProducts(res?.data ?? []);
      setStatus('success');
    } catch (err) {
      setError({ message: err.message, code: err.code });
      setProducts([]);
      setStatus('error');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Acceso de distribuidor</h1>
      <p className="text-sm text-gray-500 mb-6">
        Pega tu API Key para consultar el catálogo como distribuidor. Esta pantalla es de prueba: la key no se guarda en ningún lado, solo se usa mientras esta página está abierta.
      </p>

      <form onSubmit={onSubmit} className="flex flex-wrap gap-2 mb-6">
        <input
          className={inputCls}
          type="password"
          autoComplete="off"
          placeholder="dist_…"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm px-4 rounded-md"
        >
          {status === 'loading' ? 'Consultando…' : 'Consultar productos'}
        </button>
      </form>

      {status === 'loading' && <p className="text-gray-500">Consultando productos…</p>}

      {status === 'error' && (
        <div className="border border-red-200 bg-red-50 text-red-700 text-sm rounded-md p-3">
          <p className="font-medium">No se pudo consultar el catálogo</p>
          <p>{error?.message}</p>
          {error?.code && <p className="text-red-500 text-xs mt-1">Código: {error.code}</p>}
        </div>
      )}

      {status === 'success' && (
        products.length === 0 ? (
          <p className="text-gray-500">La API Key es válida, pero no se encontraron productos.</p>
        ) : (
          <>
            <p className="text-sm text-green-700 mb-4">API Key válida — {products.length} producto(s) encontrado(s).</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          </>
        )
      )}
    </div>
  );
}
