import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import Feedback from './Feedback';
import { useAuth } from '../hooks/useAuth';
import logo from '../assets/logo-vector.png';

const bg = { background: 'radial-gradient(circle at 50% 0%, #1e293b 0%, #0b1120 60%)' };

export const AppShell = () => {
  const { user } = useAuth();
  return (
    <div className="min-h-screen relative overflow-x-hidden font-sans text-gray-900 selection:bg-primary/30" style={bg}>
      {/* Decorative background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen opacity-50" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-cyan-600/15 rounded-full blur-[100px] mix-blend-screen opacity-40" />
      </div>

      <Sidebar />

      {/* Top bar con logo — solo mobile (en desktop el logo está en el sidebar) */}
      <header className="md:hidden sticky top-0 z-[60] flex items-center px-4 h-14 bg-[#0f172a]/90 backdrop-blur-md border-b border-white/10">
        <img src={logo} alt="Dynapro" className="h-8 w-auto object-contain" />
      </header>

      <main className="md:pl-20 pb-20 md:pb-0 min-h-screen relative z-10">
        <Outlet />
      </main>

      {user?.email && <Feedback userEmail={user.email} />}
    </div>
  );
};
