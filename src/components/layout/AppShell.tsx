import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import {
  ChartColumn,
  ChevronRight,
  DoorOpen,
  Eye,
  FileSpreadsheet,
  GraduationCap,
  History,
  Landmark,
  LayoutDashboard,
  Menu,
  RotateCcw,
  Truck,
  UserCog,
  UserRoundCheck,
  Wallet,
  WifiOff,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../modules/auth/AuthContext';
import { OVERSEER_ROLES } from '../../modules/auth/roles';
import { cn } from '../../lib/cn';
import { resetFairState, setSyncStatus, useSyncStatus } from '../../store/fairStore';
import { loadAll, subscribeToChanges } from '../../store/remote';
import { BrandStripe } from '../brand/BrandStripe';
import { AlcaldiaLogo, Escudo, FeriaLogo } from '../brand/Logos';
import { Button } from '../ui/Button';
import { StatusAlert } from '../ui/StatusAlert';
import { AccountMenu } from './AccountMenu';
import { LoadingScreen } from './LoadingScreen';

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine);
}

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const ADMIN_NAV: { label: string; items: NavItem[] }[] = [
  {
    label: 'General',
    items: [
      { to: '/admin', label: 'Panel', icon: LayoutDashboard, end: true },
      { to: '/admin/reportes', label: 'Reportes', icon: FileSpreadsheet },
      { to: '/admin/historial', label: 'Historial', icon: History },
    ],
  },
  {
    label: 'Operación',
    items: [
      { to: '/puerta', label: 'Puerta', icon: DoorOpen },
      { to: '/capacitacion', label: 'Capacitación', icon: GraduationCap },
      { to: '/logistica', label: 'Logística', icon: Truck },
      { to: '/bonos', label: 'Bonos', icon: Landmark },
      { to: '/admin/visitantes', label: 'Visitantes', icon: UserRoundCheck },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { to: '/finanzas', label: 'Ventas', icon: ChartColumn },
      { to: '/caja-menor', label: 'Caja menor', icon: Wallet },
    ],
  },
  {
    label: 'Administración',
    items: [{ to: '/admin/usuarios', label: 'Usuarios', icon: UserCog }],
  },
];

const NAV_ITEMS = ADMIN_NAV.flatMap((group) => group.items);

const todayFormat = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });

export function AppShell() {
  const { user } = useAuth();
  const isAdmin = !!user && OVERSEER_ROLES.includes(user.role);
  const readOnly = user?.role === 'observer';
  const sync = useSyncStatus();
  const online = useOnline();
  const [menuOpen, setMenuOpen] = useState(false);

  // Con la sesión abierta se traen los datos y se escuchan los cambios de los demás equipos.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    void loadAll();
    const unsubscribe = subscribeToChanges();
    return () => {
      unsubscribe();
      resetFairState();
      setSyncStatus({ phase: 'idle' });
    };
  }, [userId]);

  return (
    <div className="min-h-dvh">
      {/* La franja de la Alcaldía queda fija arriba, de lado a lado, también sobre el menú lateral. */}
      <BrandStripe className="sticky top-0 z-40 h-[3px] print:hidden" />
      <div className="lg:flex">
        {isAdmin && <AdminSidebar />}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-[3px] z-30 border-b border-carbon-200 bg-white print:hidden">
            <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setMenuOpen(true)}
                  className="-ml-2 rounded-lg p-2 text-carbon-700 hover:bg-carbon-100 lg:hidden"
                  aria-label="Abrir el menú de módulos"
                  aria-expanded={menuOpen}
                >
                  <Menu className="size-6" aria-hidden />
                </button>
              )}
              <div className={cn('flex items-center gap-3', isAdmin && 'lg:hidden')}>
                <Escudo className="h-10" />
                <span aria-hidden className="h-8 w-px bg-carbon-200" />
                <FeriaLogo className="h-10 sm:h-11" />
              </div>
              {isAdmin && <Breadcrumb />}
              <div className="ml-auto flex items-center gap-4">
                <p className="hidden text-sm text-carbon-500 first-letter:uppercase xl:block">{todayFormat.format(new Date())}</p>
                <span aria-hidden className="hidden h-6 w-px bg-carbon-200 xl:block" />
                <ConnectionStatus online={online} />
                <AccountMenu />
              </div>
            </div>
            {readOnly && (
              <p className="flex items-center gap-2 border-t border-amarillo-400/60 bg-amarillo-50 px-4 py-2 text-sm font-semibold text-amarillo-900 sm:px-6">
                <Eye className="size-4 shrink-0" aria-hidden />
                Modo observador: puedes ver todo, pero no hacer cambios.
              </p>
            )}
            {!online && (
              <p role="alert" className="flex items-center gap-2 bg-rojo-600 px-4 py-2 text-sm font-semibold text-white sm:px-6">
                <WifiOff className="size-4 shrink-0" aria-hidden />
                Sin internet: no se puede registrar nada hasta que vuelva la conexión.
              </p>
            )}
          </header>
          <main className="flex-1">
            {sync.phase === 'ready' ? (
              <Outlet />
            ) : sync.phase === 'error' ? (
              <div className="mx-auto max-w-md px-4 py-16">
                <StatusAlert tone="danger" title="No se pudieron cargar los datos">
                  {sync.message}
                </StatusAlert>
                <Button className="mt-4" icon={RotateCcw} onClick={() => void loadAll()}>
                  Intentar de nuevo
                </Button>
              </div>
            ) : (
              <LoadingScreen message="Cargando los datos de la feria…" fullScreen={false} />
            )}
          </main>
        </div>
      </div>
      {isAdmin && menuOpen && <MobileMenu onClose={() => setMenuOpen(false)} />}
    </div>
  );
}

/** Dónde está el usuario: "Feria de Emprendimiento › Puerta". Solo en escritorio, junto al menú lateral. */
function Breadcrumb() {
  const { pathname } = useLocation();
  const current = NAV_ITEMS.find((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to)));
  return (
    <nav aria-label="Ubicación" className="hidden min-w-0 items-center gap-2 text-sm lg:flex">
      <span className="text-carbon-500">Feria de Emprendimiento</span>
      {current && (
        <>
          <ChevronRight className="size-4 shrink-0 text-carbon-400" aria-hidden />
          <span className="truncate font-semibold text-carbon-900">{current.label}</span>
        </>
      )}
    </nav>
  );
}

function ConnectionStatus({ online }: { online: boolean }) {
  return (
    <p className="hidden items-center gap-2 text-sm text-carbon-600 md:flex">
      <span aria-hidden className={cn('size-2 rounded-full', online ? 'bg-verde-600' : 'bg-rojo-600')} />
      {online ? 'En línea' : 'Sin conexión'}
    </p>
  );
}

function AdminSidebar() {
  // La columna oscura se estira con la página; el contenido del menú se queda fijo al hacer scroll.
  return (
    <div className="hidden w-64 shrink-0 bg-carbon-950 lg:block print:hidden">
      <aside className="sticky top-[3px] flex h-[calc(100dvh-3px)] flex-col text-carbon-300">
        <SidebarContent />
      </aside>
    </div>
  );
}

/** En el celular, el mismo menú lateral de escritorio, que se abre desde el botón de la barra superior. */
function MobileMenu({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 lg:hidden print:hidden" role="dialog" aria-modal="true" aria-label="Menú de módulos">
      <div className="absolute inset-0 bg-carbon-950/60" onClick={onClose} aria-hidden />
      <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-carbon-950 text-carbon-300 shadow-xl">
        <BrandStripe className="h-[3px]" />
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="absolute top-4 right-3 rounded-lg p-2 text-carbon-400 hover:bg-white/10 hover:text-white"
          aria-label="Cerrar el menú"
        >
          <X className="size-5" aria-hidden />
        </button>
        <SidebarContent onNavigate={onClose} />
      </aside>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className="border-b border-white/10 px-5 pt-5 pb-5">
        <AlcaldiaLogo tone="light" />
        <p className="mt-4 text-xs font-semibold tracking-wider text-carbon-400 uppercase">Feria de Emprendimiento</p>
      </div>
      <nav aria-label="Módulos" className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
        {ADMIN_NAV.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-1.5 text-[0.6875rem] font-semibold tracking-wider text-carbon-500 uppercase">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'relative flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors lg:h-10',
                        isActive ? 'bg-white/10 text-white' : 'hover:bg-white/5 hover:text-white',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && <span aria-hidden className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-amarillo-300" />}
                        <Icon className={cn('size-[1.125rem]', isActive ? 'text-white' : 'text-carbon-400')} aria-hidden />
                        {label}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <p className="border-t border-white/10 px-5 py-4 text-xs leading-relaxed text-carbon-500">
          Alcaldía Municipal de Astrea
          <br />
          Uso exclusivo del personal autorizado
        </p>
    </>
  );
}
