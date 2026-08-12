import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ResourceManager from '../../components/admin/ResourceManager';
import { categoriesApi } from '../../api/pim';

export default function CategoriesAdmin() {
  const { data } = useQuery({ queryKey: ['categories', { activo: 'all' }], queryFn: () => categoriesApi.list({ activo: 'all' }) });
  const cats = data?.data ?? [];
  const nameById = Object.fromEntries(cats.map((c) => [c._id, c.nombre]));
  const parentOptions = [{ value: '', label: '— (categoría raíz)' }, ...cats.map((c) => ({ value: c._id, label: c.nombre }))];

  return (
    <ResourceManager
      title="Categorías"
      subtitle="Categorías y subcategorías. Asigna qué atributos aplican a cada una."
      queryKey="categories"
      api={categoriesApi}
      itemName="categoría"
      listParams={{ activo: 'all' }}
      columns={[
        { header: 'Nombre', render: (r) => r.nombre },
        { header: 'Slug', render: (r) => <code className="text-xs">{r.slug}</code> },
        { header: 'Padre', render: (r) => (r.parent ? (nameById[r.parent] || '—') : '—') },
        { header: 'Atributos propios', render: (r) => (r.attributeDefs || []).length },
        { header: '', render: (r) => <Link to={`/admin/categorias/${r._id}/atributos`} className="text-indigo-600 hover:text-indigo-800">Atributos →</Link> }
      ]}
      fields={[
        { name: 'nombre', label: 'Nombre', required: true, placeholder: 'Playeras' },
        { name: 'parent', label: 'Categoría padre', type: 'select', options: parentOptions, coerce: (v) => (v === '' ? null : v), help: 'Déjala en raíz o elige un padre (los atributos del padre se heredan)' },
        { name: 'orden', label: 'Orden', type: 'number' }
      ]}
      toForm={(r) => ({ nombre: r.nombre, parent: r.parent || '', orden: r.orden ?? 0 })}
    />
  );
}
