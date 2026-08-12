import AttributeField from './AttributeField';

// Pinta el formulario de atributos desde el attribute-schema de la categoría,
// agrupando por `group`.
export default function DynamicAttributeForm({ schema, values, onChange }) {
  if (!schema) return <p className="text-sm text-gray-400">Selecciona una categoría para ver sus atributos.</p>;
  const attrs = schema.attributes || [];
  if (attrs.length === 0) return <p className="text-sm text-gray-500">Esta categoría no tiene atributos configurados. Asígnalos en Categorías → Atributos.</p>;

  const groups = {};
  for (const a of attrs) { const g = a.group || 'General'; (groups[g] = groups[g] || []).push(a); }

  return (
    <div className="space-y-5">
      {Object.entries(groups).map(([g, list]) => (
        <div key={g}>
          <h3 className="text-xs uppercase tracking-wide text-gray-400 mb-2">{g}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {list.map((a) => (
              <AttributeField key={a._id} attr={a} value={values[a._id]} onChange={(v) => onChange(a._id, v)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
