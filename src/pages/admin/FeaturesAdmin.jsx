import ResourceManager from '../../components/admin/ResourceManager';
import { featuresApi } from '../../api/pim';

export default function FeaturesAdmin() {
  return (
    <ResourceManager
      title="Características"
      subtitle="Insignias de presencia (Cinta reflejante 3M, Costuras reforzadas…)"
      queryKey="features"
      api={featuresApi}
      itemName="característica"
      columns={[
        { header: 'Nombre', render: (r) => r.nombre },
        { header: 'Slug', render: (r) => <code className="text-xs">{r.slug}</code> },
        { header: 'Ícono', render: (r) => r.icono || '—' }
      ]}
      fields={[
        { name: 'nombre', label: 'Nombre', required: true, placeholder: 'Cinta reflejante 3M' },
        { name: 'icono', label: 'Ícono', placeholder: 'nombre o URL' },
        { name: 'descripcion', label: 'Descripción', type: 'textarea' },
        { name: 'orden', label: 'Orden', type: 'number' }
      ]}
      toForm={(r) => ({ nombre: r.nombre, icono: r.icono || '', descripcion: r.descripcion || '', orden: r.orden ?? 0 })}
    />
  );
}
