import { useAuth } from './AuthContext';

/**
 * false para el observador: la pantalla esconde los botones que cambian datos. La base de
 * datos también se lo impide, así que esto es solo para no mostrar acciones que fallarían.
 */
export function useCanEdit(): boolean {
  const { user } = useAuth();
  return user?.role !== 'observer';
}
