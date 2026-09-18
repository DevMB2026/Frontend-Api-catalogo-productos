import ResourceManager from '../../components/admin/ResourceManager';
import { badgesApi } from '../../api/pim';

export default function BadgesAdmin() {
  return (
    <ResourceManager
      title="Etiquetas"
      subtitle="Insignias promocionales sobre la tarjeta del producto (New Arrival, Últimas piezas, Más vendido…)"
      queryKey="badges"
      api={badgesApi}
      itemName="etiqueta"
      columns={[
        { header: 'Nombre', render: (r) => r.nombre },
        { header: 'Slug', render: (r) => <code className="text-xs">{r.slug}</code> },
        { header: 'Orden', render: (r) => r.orden ?? 0 }
      ]}
      fields={[
        { name: 'nombre', label: 'Texto de la etiqueta', required: true, placeholder: 'New Arrival' },
        { name: 'orden', label: 'Orden', type: 'number' }
      ]}
      toForm={(r) => ({ nombre: r.nombre, orden: r.orden ?? 0 })}
    />
  );
}
