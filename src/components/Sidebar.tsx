import { NavLink } from 'react-router-dom';
import { Search, LayoutDashboard, History, Warehouse, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import logo from '../assets/logo-vector.png';

const links = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/incoming', icon: Warehouse, label: 'Stock' },
  { to: '/search', icon: Search, label: 'Buscar' },
  { to: '/history', icon: History, label: 'Historial' },
];

const itemBase = 'flex flex-col items-center gap-1 text-[11px] font-medium transition-colors';

export const Sidebar = () => {
  const { user, logout } = useAuth();
  return (
    <>
      {/* Desktop: sidebar vertical */}
      <nav className="hidden md:flex fixed top-0 left-0 h-full w-20 flex-col items-center gap-6 py-5 bg-[#0f172a] border-r border-white/10 z-[70]">
        <img src={logo} alt="Dynapro" className="w-12 h-auto object-contain" />
        <div className="flex-1 flex flex-col gap-5 mt-2">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `${itemBase} ${isActive ? 'text-cyan-400' : 'text-white/50 hover:text-white/80'}`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </div>
        <button onClick={logout} className={`${itemBase} text-white/40 hover:text-white/70`} title={user?.email ?? ''}>
          <LogOut className="w-5 h-5" />
          Salir
        </button>
      </nav>

      {/* Mobile: bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 flex items-center justify-around bg-[#0f172a] border-t border-white/10 z-[70]">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `${itemBase} ${isActive ? 'text-cyan-400' : 'text-white/50'}`}
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
        <button onClick={logout} className={`${itemBase} text-white/40`}>
          <LogOut className="w-5 h-5" />
          Salir
        </button>
      </nav>
    </>
  );
};
