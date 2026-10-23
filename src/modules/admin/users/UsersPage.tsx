import { useMemo, useState } from 'react';
import { KeyRound, Power, UserPlus } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Chips } from '../../../components/ui/Chips';
import { StatusAlert } from '../../../components/ui/StatusAlert';
import { cn } from '../../../lib/cn';
import { formatDateTime } from '../../../lib/format';
import { useAuth } from '../../auth/AuthContext';
import { ROLE_ORDER, ROLES, type Role } from '../../auth/roles';
import { changeRole, setUserActive, useUsers, type AppUser } from '../../auth/userStore';
import { NewUserModal } from './NewUserModal';
import { ResetPasswordModal } from './ResetPasswordModal';

type RoleFilter = Role | 'all';

export function UsersPage() {
  const { user: me } = useAuth();
  const users = useUsers();
  const [filter, setFilter] = useState<RoleFilter>('all');
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState<AppUser | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      users
        .filter((u) => filter === 'all' || u.role === filter)
        .sort((a, b) => Number(b.active) - Number(a.active) || ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || a.name.localeCompare(b.name, 'es')),
    [users, filter],
  );

  function run(action: () => string | null) {
    setProblem(action());
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Usuarios y roles"
        description="Crea la cuenta de cada persona y asígnale el rol con el que va a trabajar en la feria."
        actions={
          <Button icon={UserPlus} onClick={() => setCreating(true)}>
            Nuevo usuario
          </Button>
        }
      />

      <StatusAlert tone="info" title="Las cuentas se guardan por ahora en este equipo">
        Para que cada operador entre desde su propio celular hay que conectar el servidor (Supabase). Las pantallas y las
        reglas ya quedan listas para eso.
      </StatusAlert>

      {problem && (
        <StatusAlert tone="danger" title="No se hizo el cambio">
          {problem}
        </StatusAlert>
      )}

      <Chips<RoleFilter>
        label="Filtrar por rol"
        value={filter}
        onChange={setFilter}
        items={[
          { id: 'all', label: 'Todos', count: users.length },
          ...ROLE_ORDER.map((role) => ({ id: role, label: ROLES[role].label, count: users.filter((u) => u.role === role).length })),
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
                        value={u.role}
                        disabled={isMe}
                        onChange={(e) => me && run(() => changeRole(u.id, e.target.value as Role, me.id))}
                        aria-label={`Rol de ${u.name}`}
                        className="h-10 w-full max-w-56 rounded-md border border-carbon-300 bg-white px-2 text-sm focus:border-verde-700 focus:outline-none disabled:bg-carbon-50 disabled:text-carbon-500"
                      >
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
                        <Button variant="ghost" icon={KeyRound} onClick={() => setResetting(u)}>
                          Contraseña
                        </Button>
                        {!isMe && (
                          <Button
                            variant={u.active ? 'dangerGhost' : 'ghost'}
                            icon={Power}
                            onClick={() => me && run(() => setUserActive(u.id, !u.active, me.id))}
                          >
                            {u.active ? 'Desactivar' : 'Activar'}
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

      <NewUserModal open={creating} onClose={() => setCreating(false)} />
      <ResetPasswordModal user={resetting} onClose={() => setResetting(null)} />
    </div>
  );
}
