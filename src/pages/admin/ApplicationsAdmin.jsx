import ResourceManager from '../../components/admin/ResourceManager';
import { applicationsApi } from '../../api/pim';

export default function ApplicationsAdmin() {
  return (
    <ResourceManager
      title="Aplicaciones"
      subtitle="Personalizaciones disponibles (Bordado, DTF, Vinil, Sublimado…)"
      queryKey="applications"
      api={applicationsApi}
      itemName="aplicación"
      columns={[
        { header: 'Nombre', render: (r) => r.nombre },
        { header: 'Slug', render: (r) => <code className="text-xs">{r.slug}</code> }
      ]}
      fields={[
        { name: 'nombre', label: 'Nombre', required: true, placeholder: 'Bordado' },
        { name: 'descripcion', label: 'Descripción', type: 'textarea' },
        { name: 'icono', label: 'Ícono', placeholder: 'nombre o URL' }
      ]}
      toForm={(r) => ({ nombre: r.nombre, descripcion: r.descripcion || '', icono: r.icono || '' })}
    />
  );
}
