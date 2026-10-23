import { BrowserRouter, Route, Routes } from 'react-router';
import { AppShell } from './components/layout/AppShell';
import { AdminDashboardPage } from './modules/admin/AdminDashboardPage';
import { UsersPage } from './modules/admin/users/UsersPage';
import { AuthProvider } from './modules/auth/AuthContext';
import { LoginPage } from './modules/auth/LoginPage';
import { HomeRedirect, RequireRole } from './modules/auth/RequireRole';
import { ROLE_ORDER } from './modules/auth/roles';
import { BonusesPage } from './modules/bonuses/BonusesPage';
import { DoorPage } from './modules/door/DoorPage';
import { FinancePage } from './modules/finance/FinancePage';
import { LogisticsPage } from './modules/logistics/LogisticsPage';
import { ReportsPage } from './modules/reports/ReportsPage';
import { TrainingPage } from './modules/training/TrainingPage';

// El administrador entra a todos los módulos; cada operador solo al suyo.
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
            <Route path="/admin" element={<RequireRole allow={['admin']}><AdminDashboardPage /></RequireRole>} />
            <Route path="/admin/reportes" element={<RequireRole allow={['admin']}><ReportsPage /></RequireRole>} />
            <Route path="/admin/usuarios" element={<RequireRole allow={['admin']}><UsersPage /></RequireRole>} />
            <Route path="/puerta" element={<RequireRole allow={['admin', 'door']}><DoorPage /></RequireRole>} />
            <Route path="/capacitacion" element={<RequireRole allow={['admin', 'training']}><TrainingPage /></RequireRole>} />
            <Route path="/logistica" element={<RequireRole allow={['admin', 'logistics']}><LogisticsPage /></RequireRole>} />
            <Route path="/bonos" element={<RequireRole allow={['admin', 'bonuses']}><BonusesPage /></RequireRole>} />
            <Route path="/finanzas" element={<RequireRole allow={['admin', 'finance']}><FinancePage /></RequireRole>} />
          </Route>
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
