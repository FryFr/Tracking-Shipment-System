import { RouterProvider } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Login from './components/Login';
import { router } from './router';

function App() {
  const { user, loading, error, loginWithGoogle } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={loginWithGoogle} loading={loading} error={error} />;
  }

  return <RouterProvider router={router} />;
}

export default App;
