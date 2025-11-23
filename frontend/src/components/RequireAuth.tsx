import { Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';

export function RequireAuth({ isLoggedIn, children }: { isLoggedIn: boolean; children: ReactNode }) {
  const location = useLocation();
  if (!isLoggedIn) {
    const next = location.pathname + location.search;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }
  return <>{children}</>;
}
