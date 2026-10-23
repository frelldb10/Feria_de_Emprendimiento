import { useState, type FormEvent } from 'react';
import { KeyRound } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { PasswordField } from '../../../components/ui/PasswordField';
import { generatePassword, resetPassword, validatePassword, type AppUser } from '../../auth/userStore';
import { CredentialsCard } from './CredentialsCard';

export function ResetPasswordModal({ user, onClose }: { user: AppUser | null; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);

  function close() {
    setPassword('');
    setError(undefined);
    setDone(false);
    onClose();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const problem = validatePassword(password);
    setError(problem);
    if (problem || !user) return;
    resetPassword(user.id, password);
    setDone(true);
  }

  return (
    <Modal
      open={user !== null}
      onClose={close}
      title={done ? 'Contraseña restablecida' : 'Restablecer contraseña'}
      description={user ? `${user.name} · ${user.username}` : undefined}
      footer={
        done ? (
          <Button onClick={close}>Listo</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={close}>
              Cancelar
            </Button>
            <Button type="submit" form="reset-password-form" icon={KeyRound}>
              Guardar contraseña
            </Button>
          </>
        )
      }
    >
      {user && done ? (
        <CredentialsCard name={user.name} username={user.username} password={password} />
      ) : (
        <form id="reset-password-form" onSubmit={handleSubmit} noValidate>
          <PasswordField
            label="Nueva contraseña"
            value={password}
            onChange={(value) => {
              setPassword(value);
              setError(undefined);
            }}
            onGenerate={() => {
              setPassword(generatePassword());
              setError(undefined);
            }}
            autoComplete="new-password"
            required
            hint="La contraseña anterior deja de funcionar al guardar."
            error={error}
          />
        </form>
      )}
    </Modal>
  );
}
