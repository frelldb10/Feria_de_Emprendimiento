import { useState, type FormEvent } from 'react';
import { UserPlus } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { SelectField, TextField } from '../../../components/ui/Field';
import { Modal } from '../../../components/ui/Modal';
import { PasswordField } from '../../../components/ui/PasswordField';
import { onlyLetters, suggestUsername } from '../../../lib/text';
import { ROLE_ORDER, ROLES } from '../../auth/roles';
import {
  cleanUsername,
  createUser,
  generatePassword,
  validateNewUser,
  type AppUser,
  type NewUserErrors,
  type NewUserInput,
} from '../../auth/userStore';
import { CredentialsCard } from './CredentialsCard';

const EMPTY: NewUserInput = { name: '', username: '', role: '', password: '' };

export function NewUserModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState<NewUserInput>(EMPTY);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [errors, setErrors] = useState<NewUserErrors>({});
  const [created, setCreated] = useState<{ user: AppUser; password: string } | null>(null);

  function close() {
    setForm(EMPTY);
    setUsernameTouched(false);
    setErrors({});
    setCreated(null);
    onClose();
  }

  function update<K extends keyof NewUserInput>(key: K, value: NewUserInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function changeName(value: string) {
    const name = onlyLetters(value);
    // Mientras el administrador no escriba el usuario a mano, se propone uno a partir del nombre.
    setForm((prev) => ({ ...prev, name, username: usernameTouched ? prev.username : suggestUsername(name) }));
    setErrors((prev) => ({ ...prev, name: undefined, username: undefined }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validateNewUser(form);
    setErrors(found);
    if (Object.keys(found).length > 0 || !form.role) return;
    setCreated({ user: createUser({ ...form, role: form.role }), password: form.password });
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={created ? 'Usuario creado' : 'Nuevo usuario'}
      description={created ? `${created.user.name} · ${ROLES[created.user.role].label}` : 'La persona entra con este usuario y contraseña.'}
      footer={
        created ? (
          <Button onClick={close}>Listo</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={close}>
              Cancelar
            </Button>
            <Button type="submit" form="new-user-form" icon={UserPlus}>
              Crear usuario
            </Button>
          </>
        )
      }
    >
      {created ? (
        <CredentialsCard name={created.user.name} username={created.user.username} password={created.password} />
      ) : (
        <form id="new-user-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
          <TextField
            label="Nombre completo"
            value={form.name}
            onChange={(e) => changeName(e.target.value)}
            autoCapitalize="words"
            autoComplete="off"
            required
            error={errors.name}
          />
          <TextField
            label="Usuario"
            value={form.username}
            onChange={(e) => {
              setUsernameTouched(true);
              update('username', cleanUsername(e.target.value));
            }}
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
            required
            hint="Minúsculas, sin espacios ni tildes. Ej. laura.daza"
            error={errors.username}
          />
          <SelectField
            label="Rol"
            value={form.role}
            onChange={(e) => update('role', e.target.value as NewUserInput['role'])}
            required
            hint={form.role ? ROLES[form.role].description : undefined}
            error={errors.role}
          >
            <option value="">Selecciona el rol</option>
            {ROLE_ORDER.map((role) => (
              <option key={role} value={role}>
                {ROLES[role].label}
              </option>
            ))}
          </SelectField>
          <PasswordField
            label="Contraseña inicial"
            value={form.password}
            onChange={(value) => update('password', value)}
            onGenerate={() => update('password', generatePassword())}
            autoComplete="new-password"
            required
            hint="Mínimo 6 caracteres, sin espacios."
            error={errors.password}
          />
        </form>
      )}
    </Modal>
  );
}
