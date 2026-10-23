export type EventDay = 1 | 2;
export const EVENT_DAYS: readonly EventDay[] = [1, 2];

export type SectionId = 'gastronomia' | 'manualidades' | 'moda';

export interface Entrepreneur {
  id: string;
  document: string;
  ownerName: string;
  businessName: string;
  phone: string;
  category: string;
  /** Sección de la feria para el balance de ventas; null si aún no se ha asignado. */
  section: SectionId | null;
  /** Código del stand asignado; vacío si aún no tiene. */
  stand: string;
  needsPower: boolean;
  chairs: number;
  /** null hasta que el administrador hace la generación masiva de QR. */
  qrCode: string | null;
  createdAt: string;
}

export type NewEntrepreneur = Omit<Entrepreneur, 'id' | 'qrCode' | 'createdAt'>;

/** Foto de evidencia guardada en el almacenamiento "evidencias" de Supabase. */
export interface PhotoRef {
  /** Ruta dentro del almacenamiento, ej. kits/kit_FE-0003-K7QM_20261022-101530.jpg */
  path: string;
  /** Nombre del archivo; es el que aparece en los reportes. */
  fileName: string;
  sizeKb: number;
}

export type RegistrationMethod = 'qr' | 'manual';

export interface AttendanceRecord {
  id: string;
  entrepreneurId: string;
  day: EventDay;
  at: string;
  operator: string;
  method: RegistrationMethod;
}

export interface TrainingInfo {
  title: string;
  date: string;
  place: string;
}

export interface TrainingAttendance {
  id: string;
  entrepreneurId: string;
  at: string;
  operator: string;
  method: RegistrationMethod;
}

export type KitItemId = 'gorras' | 'sueteres' | 'pendon';

export interface KitDelivery {
  id: string;
  entrepreneurId: string;
  items: Record<KitItemId, boolean>;
  photo: PhotoRef;
  at: string;
  operator: string;
}

export interface LogisticsCheck {
  standReady: boolean;
  powerConnected: boolean;
  chairsDelivered: boolean;
  updatedAt: string;
  operator: string;
}

export type LogisticsField = 'standReady' | 'powerConnected' | 'chairsDelivered';

export type AccountType = 'ahorros' | 'corriente' | 'billetera';

export interface BankAccount {
  bank: string;
  type: AccountType;
  /** Solo dígitos. En billeteras digitales es el celular asociado. */
  number: string;
  holderName: string;
  holderDocument: string;
}

/** Bono de emprendimiento: se registra la cuenta y la transferencia se hace después de la feria. */
export interface EntrepreneurshipBonus {
  id: string;
  entrepreneurId: string;
  account: BankAccount;
  dataConsent: true;
  /** Días con asistencia que se comprobaron al registrar el bono. */
  verifiedDays: EventDay[];
  at: string;
  operator: string;
}

/** Las ventas se recogen dos veces al día; cada corte guarda lo vendido desde el corte anterior. */
export type SaleCut = 1 | 2;
export const SALE_CUTS: readonly SaleCut[] = [1, 2];

export interface SaleRecord {
  id: string;
  entrepreneurId: string;
  day: EventDay;
  cut: SaleCut;
  /** Pesos colombianos, sin decimales. */
  amount: number;
  at: string;
  operator: string;
}

export type ActivityKind =
  | 'attendance'
  | 'duplicate'
  | 'unknown-code'
  | 'training'
  | 'kit'
  | 'bonus'
  | 'import'
  | 'qr';

export interface ActivityEntry {
  id: string;
  at: string;
  kind: ActivityKind;
  message: string;
}

/** Copia en memoria de lo que el usuario puede ver en el servidor (según su rol). */
export interface FairState {
  entrepreneurs: Entrepreneur[];
  attendance: AttendanceRecord[];
  training: { info: TrainingInfo; attendance: TrainingAttendance[] };
  logistics: Record<string, LogisticsCheck>;
  kits: KitDelivery[];
  bonuses: EntrepreneurshipBonus[];
  sales: SaleRecord[];
  activity: ActivityEntry[];
}
