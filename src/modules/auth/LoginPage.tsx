import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { ChartColumn, DoorOpen, GraduationCap, Landmark, LogIn, Truck, Wallet } from 'lucide-react';
import { BrandStripe } from '../../components/brand/BrandStripe';
import { AlcaldiaLogo, Escudo, FeriaLogo } from '../../components/brand/Logos';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { PasswordField } from '../../components/ui/PasswordField';
import { StatusAlert } from '../../components/ui/StatusAlert';
import { LoadingScreen } from '../../components/layout/LoadingScreen';
import { SUPABASE_CONFIGURED } from '../../lib/supabase';
import { useAuth } from './AuthContext';
import { ROLES } from './roles';
import { cleanUsername } from './users';

const MODULES = [
  { label: 'Control de ingreso', icon: DoorOpen },
  { label: 'Capacitación', icon: GraduationCap },
  { label: 'Logística y kits', icon: Truck },
  { label: 'Bonos', icon: Landmark },
  { label: 'Ventas', icon: ChartColumn },
  { label: 'Caja menor', icon: Wallet },
];

export function LoginPage() {
  const { status, user, notice, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (status === 'loading') return <LoadingScreen />;
  if (user) return <Navigate to={ROLES[user.role].home} replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!username || !password) {
      setError('Escribe tu usuario y tu contraseña.');
      return;
    }
    setBusy(true);
    const result = await login(username, password);
    setBusy(false);
    if (result.ok) navigate(ROLES[result.user.role].home, { replace: true });
    else {
      setError(result.message);
      setPassword('');
    }
  }

  const shownError = error ?? notice;

  return (
    <div className="min-h-dvh bg-carbon-50 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="relative hidden flex-col justify-between bg-carbon-950 px-12 py-10 text-white lg:flex">
        <AlcaldiaLogo tone="light" className="[&_img]:h-16" />
        <div className="max-w-md">
          <p className="text-xs font-semibold tracking-wider text-amarillo-300 uppercase">Sistema de gestión</p>
          <h1 className="mt-3 text-3xl leading-tight font-semibold tracking-tight">Feria de Emprendimiento</h1>
          <p className="mt-3 leading-relaxed text-carbon-300">
            Registro y control de la feria en un solo sistema. Cada funcionario entra con su cuenta y ve solo su área de trabajo.
          </p>
          <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-carbon-200">
            {MODULES.map(({ label, icon: Icon }) => (
              <li key={label} className="flex items-center gap-2.5">
                <Icon className="size-4 shrink-0 text-carbon-400" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3">
          <BrandStripe rounded className="h-1.5 max-w-48" />
          <p className="text-xs text-carbon-400">Alcaldía Municipal de Astrea · {new Date().getFullYear()}</p>
        </div>
      </aside>

      <main className="flex min-h-dvh flex-col lg:min-h-0 lg:justify-center">
        <BrandStripe className="lg:hidden" />
        <div className="mx-auto w-full max-w-md px-4 pt-10 pb-10 sm:px-6">
          <div className="flex items-center justify-center gap-4">
            <Escudo className="h-14 lg:hidden" />
            <span aria-hidden className="h-10 w-px bg-carbon-200 lg:hidden" />
            <FeriaLogo className="h-14 sm:h-16" />
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-lg border border-carbon-200 bg-white p-6 shadow-card sm:p-8" noValidate>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Iniciar sesión</h2>
              <p className="mt-1 text-sm text-carbon-500">Ingresa con el usuario y la contraseña que te asignó el administrador.</p>
            </div>

            {!SUPABASE_CONFIGURED && (
              <StatusAlert tone="warning" title="Falta la conexión con el servidor">
                Copia el archivo .env.example con el nombre .env.local, escribe ahí la dirección y la clave pública del
                proyecto de Supabase y vuelve a iniciar la aplicación.
              </StatusAlert>
            )}
            {shownError && <StatusAlert tone="danger" title={shownError} />}

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

            <Button type="submit" size="lg" fullWidth icon={LogIn} disabled={busy || !SUPABASE_CONFIGURED}>
              {busy ? 'Entrando…' : 'Entrar'}
            </Button>

            <p className="border-t border-carbon-100 pt-4 text-sm text-carbon-500">
              ¿Olvidaste tu contraseña? Pídele al administrador que la restablezca desde la sección Usuarios.
            </p>
          </form>
          <p className="mt-6 text-center text-xs text-carbon-500">Acceso exclusivo para el personal autorizado de la feria.</p>
        </div>
      </main>
    </div>
  );
}
