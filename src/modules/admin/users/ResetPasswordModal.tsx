import { useState, type FormEvent } from 'react';
import { KeyRound } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { PasswordField } from '../../../components/ui/PasswordField';
import { StatusAlert } from '../../../components/ui/StatusAlert';
import { describeError } from '../../../lib/supabase';
import { generatePassword, resetPassword, validatePassword, type AppUser } from '../../auth/users';
import { CredentialsCard } from './CredentialsCard';

export function ResetPasswordModal({ user, onClose }: { user: AppUser | null; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function close() {
    if (busy) return;
    setPassword('');
    setError(undefined);
    setFailure(null);
    setDone(false);
    onClose();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const problem = validatePassword(password);
    setError(problem);
    if (problem || !user) return;
    setBusy(true);
    setFailure(null);
    try {
      await resetPassword(user.id, password);
      setDone(true);
    } catch (failed) {
      setFailure(describeError(failed));
    } finally {
      setBusy(false);
    }
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
            <Button variant="secondary" onClick={close} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" form="reset-password-form" icon={KeyRound} disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar contraseña'}
            </Button>
          </>
        )
      }
    >
      {user && done ? (
        <CredentialsCard name={user.name} username={user.username} password={password} />
      ) : (
        <form id="reset-password-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
          {failure && (
            <StatusAlert tone="danger" title="No se cambió la contraseña">
              {failure}
            </StatusAlert>
          )}
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
