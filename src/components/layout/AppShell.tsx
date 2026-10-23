import { NavLink, Outlet } from 'react-router';
import {
  ChartColumn,
  DoorOpen,
  FileSpreadsheet,
  GraduationCap,
  Landmark,
  LayoutDashboard,
  Truck,
  UserCog,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../modules/auth/AuthContext';
import { cn } from '../../lib/cn';
import { BrandStripe } from '../brand/BrandStripe';
import { AlcaldiaLogo, Escudo, FeriaLogo } from '../brand/Logos';
import { AccountMenu } from './AccountMenu';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const ADMIN_NAV: NavItem[] = [
  { to: '/admin', label: 'Panel', icon: LayoutDashboard, end: true },
  { to: '/puerta', label: 'Puerta', icon: DoorOpen },
  { to: '/capacitacion', label: 'Capacitación', icon: GraduationCap },
  { to: '/logistica', label: 'Logística', icon: Truck },
  { to: '/bonos', label: 'Bonos', icon: Landmark },
  { to: '/finanzas', label: 'Finanzas', icon: ChartColumn },
  { to: '/admin/reportes', label: 'Reportes', icon: FileSpreadsheet },
  { to: '/admin/usuarios', label: 'Usuarios', icon: UserCog },
];

export function AppShell() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-dvh lg:flex">
      {isAdmin && <AdminSidebar />}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 bg-white print:hidden">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <Escudo className={cn('h-10', isAdmin && 'lg:hidden')} />
            <span aria-hidden className={cn('h-8 w-px bg-carbon-200', isAdmin && 'lg:hidden')} />
            <FeriaLogo className="h-10 sm:h-11" />
            <div className="ml-auto">
              <AccountMenu />
            </div>
          </div>
          <BrandStripe />
          {isAdmin && <AdminTabs />}
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function AdminSidebar() {
  // La columna oscura se estira con la página; el contenido del menú se queda fijo al hacer scroll.
  return (
    <div className="hidden w-64 shrink-0 bg-carbon-950 lg:block print:hidden">
      <AdminSidebarContent />
    </div>
  );
}

function AdminSidebarContent() {
  return (
    <aside className="sticky top-0 flex h-dvh flex-col text-carbon-300">
      <div className="px-5 pt-6 pb-8">
        <AlcaldiaLogo tone="light" />
      </div>
      <nav aria-label="Módulos" className="flex-1 space-y-1 px-3">
        {ADMIN_NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'relative flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors',
                isActive ? 'bg-carbon-800 text-white' : 'hover:bg-carbon-900 hover:text-white',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span aria-hidden className="absolute inset-y-2 left-0 w-1 rounded-r bg-amarillo-300" />}
                <Icon className="size-5" aria-hidden />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <p className="px-5 py-5 text-xs leading-relaxed text-carbon-400">
        Feria de Emprendimiento
        <br />
        Alcaldía Municipal de Astrea
      </p>
    </aside>
  );
}

function AdminTabs() {
  return (
    <nav aria-label="Módulos" className="flex gap-1 overflow-x-auto border-b border-carbon-200 px-3 py-2 lg:hidden">
      {ADMIN_NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold',
              isActive ? 'bg-carbon-900 text-white' : 'text-carbon-600 hover:bg-carbon-100',
            )
          }
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
