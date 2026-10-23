import { ChartColumn, DoorOpen, Eye, GraduationCap, Landmark, LayoutDashboard, Truck, type LucideIcon } from 'lucide-react';

export type Role = 'admin' | 'observer' | 'door' | 'logistics' | 'bonuses' | 'training' | 'finance';

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
  observer: {
    label: 'Observador',
    home: '/admin',
    description: 'Ve el panel, todos los módulos y los reportes, sin hacer cambios.',
    icon: Eye,
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

export const ROLE_ORDER: Role[] = ['admin', 'observer', 'door', 'training', 'logistics', 'bonuses', 'finance'];

/** Roles con el menú completo del administrador (el observador lo ve todo, pero sin editar). */
export const OVERSEER_ROLES: Role[] = ['admin', 'observer'];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && value in ROLES;
}
