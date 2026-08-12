import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Lista de un recurso (con caché por queryKey + params).
export function useResourceList(queryKey, api, params) {
  return useQuery({
    queryKey: [queryKey, params || {}],
    queryFn: () => api.list(params)
  });
}

// Mutaciones (create/update/remove) que invalidan la lista al terminar.
export function useResourceMutations(queryKey, api) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: [queryKey] });
  return {
    create: useMutation({ mutationFn: (body) => api.create(body), onSuccess: invalidate }),
    update: useMutation({ mutationFn: ({ id, body }) => api.update(id, body), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: (id) => api.remove(id), onSuccess: invalidate })
  };
}
