import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from './AuthContext';
import { ROLES, type Role } from './roles';

/** Sin sesión manda al login; con un rol sin permiso, a la pantalla de ese rol. */
export function RequireRole({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/ingresar" replace />;
  if (!allow.includes(user.role)) return <Navigate to={ROLES[user.role].home} replace />;
  return children;
}

export function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? ROLES[user.role].home : '/ingresar'} replace />;
}
