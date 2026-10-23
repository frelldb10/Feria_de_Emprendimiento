import { useMemo, useState } from 'react';
import { KeyRound, Power, UserPlus } from 'lucide-react';
import { LoadingScreen } from '../../../components/layout/LoadingScreen';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Chips } from '../../../components/ui/Chips';
import { StatusAlert } from '../../../components/ui/StatusAlert';
import { cn } from '../../../lib/cn';
import { formatDateTime } from '../../../lib/format';
import { describeError } from '../../../lib/supabase';
import { useAuth } from '../../auth/AuthContext';
import { useCanEdit } from '../../auth/useCanEdit';
import { ROLE_ORDER, ROLES, type Role } from '../../auth/roles';
import { changeRole, setUserActive, useUserList, type AppUser } from '../../auth/users';
import { NewUserModal } from './NewUserModal';
import { ResetPasswordModal } from './ResetPasswordModal';

type RoleFilter = Role | 'all' | 'none';

const roleOrder = (role: Role | null) => (role ? ROLE_ORDER.indexOf(role) : -1);

export function UsersPage() {
  const { user: me } = useAuth();
  const canEdit = useCanEdit();
  const { users, error, loading } = useUserList();
  const [filter, setFilter] = useState<RoleFilter>('all');
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState<AppUser | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      users
        .filter((u) => filter === 'all' || (filter === 'none' ? u.role === null : u.role === filter))
        .sort((a, b) => Number(b.active) - Number(a.active) || roleOrder(a.role) - roleOrder(b.role) || a.name.localeCompare(b.name, 'es')),
    [users, filter],
  );
  const withoutRole = users.filter((u) => u.role === null).length;

  /** Aplica un cambio en el servidor; la lista se actualiza sola por tiempo real. */
  async function run(userId: string, action: () => Promise<void>) {
    setWorking(userId);
    setProblem(null);
    try {
      await action();
    } catch (failure) {
      setProblem(describeError(failure));
    } finally {
      setWorking(null);
    }
  }

  if (loading) return <LoadingScreen message="Cargando usuarios…" fullScreen={false} />;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Usuarios y roles"
        description={
          canEdit
            ? 'Crea la cuenta de cada persona y asígnale el rol con el que va a trabajar en la feria.'
            : 'Cuentas de la feria y su rol. Solo el administrador puede cambiarlas.'
        }
        actions={
          canEdit && (
            <Button icon={UserPlus} onClick={() => setCreating(true)}>
              Nuevo usuario
            </Button>
          )
        }
      />

      {(problem ?? error) && (
        <StatusAlert tone="danger" title="No se hizo el cambio">
          {problem ?? error}
        </StatusAlert>
      )}

      <Chips<RoleFilter>
        label="Filtrar por rol"
        value={filter}
        onChange={setFilter}
        items={[
          { id: 'all', label: 'Todos', count: users.length },
          ...ROLE_ORDER.map((role) => ({ id: role, label: ROLES[role].label, count: users.filter((u) => u.role === role).length })),
          ...(withoutRole > 0 ? [{ id: 'none' as const, label: 'Sin rol', count: withoutRole }] : []),
        ]}
      />

      <Card title={`${visible.length} ${visible.length === 1 ? 'usuario' : 'usuarios'}`} flush>
        <div className="overflow-x-auto">
          <table className="w-full min-w-3xl text-left text-sm">
            <thead className="bg-carbon-50 text-xs tracking-wide text-carbon-600 uppercase">
              <tr>
                <th className="px-4 py-2.5 font-semibold sm:pl-5">Persona</th>
                <th className="px-3 py-2.5 font-semibold">Rol</th>
                <th className="px-3 py-2.5 font-semibold">Estado</th>
                <th className="px-3 py-2.5 font-semibold">Última modificación</th>
                <th className="px-4 py-2.5 text-right font-semibold sm:pr-5">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-carbon-100">
              {visible.map((u) => {
                const isMe = u.id === me?.id;
                const busy = working === u.id;
                return (
                  <tr key={u.id} className={cn(!u.active && 'bg-carbon-50 text-carbon-500')}>
                    <td className="px-4 py-3 sm:pl-5">
                      <p className="font-semibold text-carbon-900">
                        {u.name}
                        {isMe && <span className="ml-2 text-xs font-medium text-verde-700">(tú)</span>}
                      </p>
                      <p className="font-mono text-xs text-carbon-500">{u.username}</p>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={u.role ?? ''}
                        disabled={isMe || busy || !canEdit}
                        onChange={(e) => void run(u.id, () => changeRole(u.id, e.target.value as Role))}
                        aria-label={`Rol de ${u.name}`}
                        className={cn(
                          'h-10 w-full max-w-56 rounded-md border bg-white px-2 text-sm focus:border-verde-700 focus:outline-none disabled:bg-carbon-50 disabled:text-carbon-500',
                          u.role ? 'border-carbon-300' : 'border-amarillo-500 text-amarillo-900',
                        )}
                      >
                        {!u.role && <option value="">Sin rol: elige uno</option>}
                        {ROLE_ORDER.map((role) => (
                          <option key={role} value={role}>
                            {ROLES[role].label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3">{u.active ? <Badge tone="success">Activo</Badge> : <Badge>Desactivado</Badge>}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-carbon-500">{formatDateTime(u.updatedAt)}</td>
                    <td className="px-4 py-2 sm:pr-5">
                      <div className="flex justify-end gap-1.5">
                        {canEdit && (
                          <Button variant="ghost" icon={KeyRound} onClick={() => setResetting(u)} disabled={busy}>
                            Contraseña
                          </Button>
                        )}
                        {canEdit && !isMe && (
                          <Button
                            variant={u.active ? 'dangerGhost' : 'ghost'}
                            icon={Power}
                            disabled={busy}
                            onClick={() => void run(u.id, () => setUserActive(u.id, !u.active))}
                          >
                            {busy ? 'Guardando…' : u.active ? 'Desactivar' : 'Activar'}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <NewUserModal open={creating} onClose={() => setCreating(false)} existing={users} />
      <ResetPasswordModal user={resetting} onClose={() => setResetting(null)} />
    </div>
  );
}
