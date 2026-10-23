import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { LogIn } from 'lucide-react';
import { BrandStripe } from '../../components/brand/BrandStripe';
import { AlcaldiaLogo, Escudo, FeriaLogo } from '../../components/brand/Logos';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { PasswordField } from '../../components/ui/PasswordField';
import { StatusAlert } from '../../components/ui/StatusAlert';
import { useAuth } from './AuthContext';
import { ROLES } from './roles';
import { cleanUsername, INITIAL_ADMIN_CONFIGURED, useUsers } from './userStore';

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const noAccounts = useUsers().length === 0 && !INITIAL_ADMIN_CONFIGURED;

  if (user) return <Navigate to={ROLES[user.role].home} replace />;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!username || !password) {
      setError('Escribe tu usuario y tu contraseña.');
      return;
    }
    const result = login(username, password);
    if (result.ok) navigate(ROLES[result.user.role].home, { replace: true });
    else {
      setError(result.message);
      setPassword('');
    }
  }

  return (
    <div className="min-h-dvh bg-white lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden flex-col justify-between bg-carbon-950 px-12 py-10 text-white lg:flex">
        <AlcaldiaLogo tone="light" className="[&_img]:h-20" />
        <div className="max-w-md">
          <p className="font-display text-sm font-semibold tracking-wide text-amarillo-300 uppercase">Feria de Emprendimiento</p>
          <h1 className="mt-3 font-display text-4xl leading-tight font-semibold">
            Ingreso, capacitación, logística, bonos y ventas en un solo lugar.
          </h1>
          <p className="mt-4 text-carbon-300">
            Cada persona entra con la cuenta que le asignó el administrador y ve solo lo que necesita en su punto de trabajo.
          </p>
        </div>
        <BrandStripe rounded className="h-2 max-w-xs" />
      </aside>

      <main className="flex min-h-dvh flex-col lg:min-h-0 lg:justify-center">
        <BrandStripe className="lg:hidden" />
        <div className="mx-auto w-full max-w-md px-4 pt-8 pb-10 sm:px-6">
          <div className="flex items-center justify-center gap-4">
            <Escudo className="h-16 lg:hidden" />
            <FeriaLogo className="h-16 sm:h-20" />
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
            <div>
              <h2 className="font-display text-2xl font-semibold">Ingresar</h2>
              <p className="mt-1 text-sm text-carbon-500">Usa el usuario y la contraseña que te dio el administrador.</p>
            </div>

            {noAccounts && (
              <StatusAlert tone="warning" title="Falta configurar el primer administrador">
                Copia el archivo .env.example con el nombre .env.local, escribe ahí el usuario y la contraseña del
                administrador y vuelve a iniciar la aplicación.
              </StatusAlert>
            )}
            {error && <StatusAlert tone="danger" title={error} />}

            <TextField
              label="Usuario"
              value={username}
              onChange={(event) => {
                setUsername(cleanUsername(event.target.value));
                setError(null);
              }}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Ej. laura.daza"
              size="lg"
            />
            <PasswordField
              label="Contraseña"
              value={password}
              onChange={(value) => {
                setPassword(value);
                setError(null);
              }}
              autoComplete="current-password"
            />

            <Button type="submit" size="lg" fullWidth icon={LogIn}>
              Entrar
            </Button>

            <p className="text-sm text-carbon-500">
              ¿Olvidaste tu contraseña? Pídele al administrador que la restablezca desde la sección Usuarios.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
