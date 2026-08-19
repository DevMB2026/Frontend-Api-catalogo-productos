import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const linkBase = 'px-3 py-2 rounded-md text-sm font-medium transition-colors';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navClass = ({ isActive }) =>
    `${linkBase} ${isActive ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4 min-h-16 py-2 flex items-center justify-between gap-4 flex-wrap">
          <Link to="/admin" className="font-bold text-lg">Catálogo · Admin</Link>
          <nav className="flex items-center gap-1 flex-wrap">
            <NavLink to="/admin" end className={navClass}>Productos</NavLink>
            <NavLink to="/admin/marcas" className={navClass}>Marcas</NavLink>
            <NavLink to="/admin/catalogos" className={navClass}>Catálogos</NavLink>
            <NavLink to="/admin/distribuidores" className={navClass}>Distribuidores</NavLink>
            <NavLink to="/admin/notificaciones" className={navClass}>Notificaciones</NavLink>
            <span className="w-px h-5 bg-gray-700 mx-1" aria-hidden="true" />
            <NavLink to="/admin/atributos" className={navClass}>Atributos</NavLink>
            <NavLink to="/admin/caracteristicas" className={navClass}>Características</NavLink>
            <NavLink to="/admin/aplicaciones" className={navClass}>Aplicaciones</NavLink>
            <NavLink to="/admin/opciones" className={navClass}>Opciones</NavLink>
            <NavLink to="/admin/tablas-medidas" className={navClass}>Tablas</NavLink>
            <NavLink to="/admin/categorias" className={navClass}>Categorías</NavLink>
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400 hidden sm:inline">{user?.email}</span>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-md"
            >
              Salir
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}
