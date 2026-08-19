import { useQuery } from '@tanstack/react-query';
import { listNotifications } from '../../api/adminNotification';

const EVENTO_LABEL = {
  desactivado: { texto: 'Desactivado', cls: 'bg-red-50 text-red-700' },
  agotado: { texto: 'Sin stock', cls: 'bg-amber-50 text-amber-700' }
};

export default function NotificacionesAdmin() {
  const { data, isLoading, error } = useQuery({ queryKey: ['notificaciones'], queryFn: listNotifications });
  const rows = data?.data ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
        <p className="text-sm text-gray-500">
          Historial de avisos enviados por correo a distribuidores y equipo interno cuando un producto se desactiva o se queda sin stock.
        </p>
      </div>

      {isLoading ? (
        <p className="text-gray-500">Cargando…</p>
      ) : error ? (
        <p className="text-red-600">Error: {error.message}</p>
      ) : rows.length === 0 ? (
        <p className="text-gray-500">Todavía no se ha enviado ningún aviso.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Evento</th>
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium">Destinatarios</th>
                <th className="px-4 py-3 font-medium">Envío</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => {
                const evento = EVENTO_LABEL[row.evento] || { texto: row.evento, cls: 'bg-gray-100 text-gray-700' };
                return (
                  <tr key={row._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(row.createdAt).toLocaleString('es-MX')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${evento.cls}`}>{evento.texto}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {row.productoNombre} <span className="text-gray-400 text-xs">· SKU {row.productoSku}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{row.destinatarios.length}</td>
                    <td className="px-4 py-3">
                      {row.enviadoOk
                        ? <span className="text-emerald-600 text-xs">Enviado</span>
                        : <span className="text-red-500 text-xs">Falló</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
