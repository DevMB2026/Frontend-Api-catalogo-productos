import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Solo rutas internas (evita redirigir a otro sitio con ?next=//dominio o https://…).
const safeNext = (n) => (n && n.startsWith('/') && !n.startsWith('//') ? n : null);

const TEXTOS = {
  admin: { titulo: 'Panel de administración', subtitulo: 'Inicia sesión para gestionar el catálogo' },
  clientes: { titulo: 'Acceso clientes', subtitulo: 'Inicia sesión para ver tus precios' }
};

// Mismo login (mismo endpoint y JWT) para /login (admin) y /clientes (personas
// con acceso a precios); solo cambian los textos y a dónde se va al entrar.
// Qué precios ve cada quien lo decide el backend (pricePermissions).
export default function Login({ modo = 'admin' }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const textos = TEXTOS[modo] || TEXTOS.admin;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // login() ya devolvía { role, ... } (nada nuevo del backend) — antes
      // se ignoraba y siempre se navegaba a /admin. Un role:'usuario' no
      // tiene panel administrativo todavía, así que lo mandamos al catálogo
      // en vez de dejar que ProtectedRoute lo rebote justo después.
      // En /clientes siempre se vuelve al catálogo (o a la ficha de donde venía).
      const user = await login(email, password);
      if (modo === 'clientes') navigate(safeNext(searchParams.get('next')) || '/');
      else navigate(user.role === 'usuario' ? '/' : '/admin');
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-xl shadow p-8 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{textos.titulo}</h1>
          <p className="text-sm text-gray-500 mt-1">{textos.subtitulo}</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm rounded-md px-3 py-2">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="tu-email@dominio.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-md transition-colors"
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
