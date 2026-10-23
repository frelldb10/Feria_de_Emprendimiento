import { ChartColumn, DoorOpen, GraduationCap, Landmark, LayoutDashboard, Truck, type LucideIcon } from 'lucide-react';

export type Role = 'admin' | 'door' | 'logistics' | 'bonuses' | 'training' | 'finance';

export interface RoleInfo {
  label: string;
  home: string;
  description: string;
  icon: LucideIcon;
}

export const ROLES: Record<Role, RoleInfo> = {
  admin: {
    label: 'Administrador',
    home: '/admin',
    description: 'Métricas, carga de emprendedores, códigos QR y reportes.',
    icon: LayoutDashboard,
  },
  door: {
    label: 'Operador de Puerta',
    home: '/puerta',
    description: 'Registro de ingreso con QR, Día 1 y Día 2.',
    icon: DoorOpen,
  },
  training: {
    label: 'Operador de Capacitación',
    home: '/capacitacion',
    description: 'Asistencia a la capacitación con QR.',
    icon: GraduationCap,
  },
  logistics: {
    label: 'Operador de Logística',
    home: '/logistica',
    description: 'Stands, energía, sillas y entrega de kits.',
    icon: Truck,
  },
  bonuses: {
    label: 'Operador de Bonos',
    home: '/bonos',
    description: 'Cuentas bancarias para el bono de emprendimiento.',
    icon: Landmark,
  },
  finance: {
    label: 'Financiero',
    home: '/finanzas',
    description: 'Ventas por sección en dos cortes al día y balance.',
    icon: ChartColumn,
  },
};

export const ROLE_ORDER: Role[] = ['admin', 'door', 'training', 'logistics', 'bonuses', 'finance'];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && value in ROLES;
}
