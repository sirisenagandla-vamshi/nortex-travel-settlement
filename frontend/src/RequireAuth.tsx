import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth';
import { Layout } from './components/Layout';

export function RequireAuth() {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <div className="p-8 text-muted">Loading…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Layout />;
}
