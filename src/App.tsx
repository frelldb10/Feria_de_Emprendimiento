import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { AppShell } from './components/layout/AppShell';
import { LoadingScreen } from './components/layout/LoadingScreen';
import { AuthProvider } from './modules/auth/AuthContext';
import { LoginPage } from './modules/auth/LoginPage';
import { HomeRedirect, RequireRole } from './modules/auth/RequireRole';
import { ROLE_ORDER, type Role } from './modules/auth/roles';

// Cada módulo se descarga solo cuando se abre: el celular de la puerta no baja el panel del administrador.
const AdminDashboardPage = lazy(() => import('./modules/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })));
const UsersPage = lazy(() => import('./modules/admin/users/UsersPage').then((m) => ({ default: m.UsersPage })));
const ReportsPage = lazy(() => import('./modules/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const DoorPage = lazy(() => import('./modules/door/DoorPage').then((m) => ({ default: m.DoorPage })));
const TrainingPage = lazy(() => import('./modules/training/TrainingPage').then((m) => ({ default: m.TrainingPage })));
const LogisticsPage = lazy(() => import('./modules/logistics/LogisticsPage').then((m) => ({ default: m.LogisticsPage })));
const BonusesPage = lazy(() => import('./modules/bonuses/BonusesPage').then((m) => ({ default: m.BonusesPage })));
const FinancePage = lazy(() => import('./modules/finance/FinancePage').then((m) => ({ default: m.FinancePage })));

function Page({ allow, children }: { allow: Role[]; children: ReactNode }) {
  return (
    <RequireRole allow={allow}>
      <Suspense fallback={<LoadingScreen fullScreen={false} />}>{children}</Suspense>
    </RequireRole>
  );
}

// El administrador y el observador entran a todos los módulos; cada operador solo al suyo.
export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/ingresar" element={<LoginPage />} />
          <Route
            element={
              <RequireRole allow={ROLE_ORDER}>
                <AppShell />
              </RequireRole>
            }
          >
            <Route path="/admin" element={<Page allow={['admin', 'observer']}><AdminDashboardPage /></Page>} />
            <Route path="/admin/reportes" element={<Page allow={['admin', 'observer']}><ReportsPage /></Page>} />
            <Route path="/admin/usuarios" element={<Page allow={['admin', 'observer']}><UsersPage /></Page>} />
            <Route path="/puerta" element={<Page allow={['admin', 'observer', 'door']}><DoorPage /></Page>} />
            <Route path="/capacitacion" element={<Page allow={['admin', 'observer', 'training']}><TrainingPage /></Page>} />
            <Route path="/logistica" element={<Page allow={['admin', 'observer', 'logistics']}><LogisticsPage /></Page>} />
            <Route path="/bonos" element={<Page allow={['admin', 'observer', 'bonuses']}><BonusesPage /></Page>} />
            <Route path="/finanzas" element={<Page allow={['admin', 'observer', 'finance']}><FinancePage /></Page>} />
          </Route>
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
