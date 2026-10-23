import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { useAuth } from '../../modules/auth/AuthContext';
import { ROLES } from '../../modules/auth/roles';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

export function AccountMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  if (!user) return null;
  const role = ROLES[user.role];
  const RoleIcon = role.icon;

  function handleLogout() {
    setOpen(false);
    logout();
    navigate('/ingresar', { replace: true });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 items-center gap-2.5 rounded-lg px-2 text-left hover:bg-carbon-100 sm:pr-3"
        aria-haspopup="dialog"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-carbon-800 text-white">
          <UserRound className="size-4" aria-hidden />
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block max-w-40 truncate text-sm font-semibold text-carbon-900">{user.name}</span>
          <span className="block text-xs text-carbon-500">{role.label}</span>
        </span>
        <ChevronDown className="size-4 text-carbon-500" aria-hidden />
        <span className="sr-only">Abrir menú de la cuenta</span>
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={user.name}
        description={`Usuario: ${user.username}`}
        footer={
          <Button variant="secondary" icon={LogOut} onClick={handleLogout}>
            Cerrar sesión
          </Button>
        }
      >
        <div className="flex items-center gap-3 rounded-lg bg-carbon-50 px-4 py-3">
          <RoleIcon className="size-5 text-verde-700" aria-hidden />
          <div>
            <p className="font-semibold text-carbon-900">{role.label}</p>
            <p className="text-sm text-carbon-500">{role.description}</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-carbon-500">El rol y la contraseña los administra el administrador de la feria.</p>
      </Modal>
    </>
  );
}
