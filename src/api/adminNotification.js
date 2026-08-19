import { apiFetch } from './client';

// Historial de avisos (desactivado/agotado) enviados a distribuidores y equipo interno.
export const listNotifications = () => apiFetch('/notificaciones', { auth: true });
