export type EventDay = 1 | 2;
export const EVENT_DAYS: readonly EventDay[] = [1, 2];

export type SectionId = 'gastronomia' | 'manualidades' | 'moda';

export interface Entrepreneur {
  id: string;
  /** Vacío si el archivo de carga no lo traía. */
  document: string;
  ownerName: string;
  businessName: string;
  phone: string;
  category: string;
  /** Sección de la feria para el balance de ventas; null si aún no se ha asignado. */
  section: SectionId | null;
  /** Código del stand asignado; vacío si aún no tiene. */
  stand: string;
  /** false si trae su propio stand. */
  needsStand: boolean;
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

export type PettyCashCategory = 'transporte' | 'alimentacion' | 'papeleria' | 'ferreteria' | 'aseo' | 'imprevistos';

/** Dinero que el administrador entrega para la caja menor de un día. */
export interface PettyCashFund {
  day: EventDay;
  /** Pesos colombianos, sin decimales. */
  amount: number;
  at: string;
  operator: string;
}

export interface PettyCashExpense {
  id: string;
  day: EventDay;
  amount: number;
  category: PettyCashCategory;
  /** En qué se gastó, ej. "Taxi para traer las carpas". */
  description: string;
  at: string;
  operator: string;
}

export type NewPettyCashExpense = Pick<PettyCashExpense, 'day' | 'amount' | 'category' | 'description'>;

export type ActivityKind =
  | 'attendance'
  | 'duplicate'
  | 'unknown-code'
  | 'training'
  | 'kit'
  | 'bonus'
  | 'import'
  | 'qr'
  | 'petty-cash'
  | 'correction'
  | 'archive'
  | 'visitor';

export type VisitorOrigin = 'astrea_urbano' | 'astrea_rural' | 'cesar' | 'otro_departamento';
export type HeardFrom = 'redes' | 'radio' | 'conocidos' | 'de_paso' | 'otro';
export type TripPurpose = 'feria' | 'familia' | 'trabajo' | 'transito' | 'otro';
export type Lodging = 'hotel' | 'familia' | 'otro';
export type Transport = 'moto' | 'carro' | 'bus' | 'otro';

/** Preguntas de la encuesta para las estadísticas de turismo. */
export interface VisitorSurvey {
  phone: string;
  /** Personas del grupo de viaje, contándose a sí mismo; 5 quiere decir "5 o más". */
  groupSize: number | null;
  heardFrom: HeardFrom | null;
  /** Lo que sigue solo se pregunta a quien viene de otro municipio. */
  tripPurpose: TripPurpose | null;
  /** Noches en Astrea: 0 es visita del día; 3 quiere decir "3 o más". */
  nights: number | null;
  lodging: Lodging | null;
  transport: Transport | null;
}

/**
 * Persona del público que registró su visita escaneando el QR. Los registros anteriores a la
 * encuesta tienen el teléfono vacío y las demás respuestas en null.
 */
export interface Visitor extends VisitorSurvey {
  id: string;
  fullName: string;
  document: string;
  origin: VisitorOrigin;
  /** Barrio, vereda, municipio o departamento; puede ir vacío en el casco urbano. */
  originDetail: string;
  at: string;
  /** Fecha de la visita en Colombia, AAAA-MM-DD. */
  visitDate: string;
}

export interface NewVisitor extends VisitorSurvey {
  fullName: string;
  document: string;
  origin: VisitorOrigin;
  originDetail: string;
  consent: boolean;
}

/**
 * Cifras de una feria guardada en el historial. Si cambia la forma, se sube version y la
 * pantalla de historial sigue leyendo las versiones viejas.
 */
export interface EditionSummary {
  version: 1;
  training: { title: string; date: string; attendees: number };
  entrepreneurs: number;
  attendance: { day1: number; day2: number; anyDay: number; bothDays: number };
  kits: { complete: number; partial: number };
  bonusAccounts: number;
  sales: { day1: number; day2: number; total: number; reporters: number };
  bySection: { label: string; entrepreneurs: number; sales: number }[];
  pettyCash: { assigned: number; spent: number; byCategory: { label: string; total: number }[] };
  /**
   * No está en las ferias guardadas antes del módulo de visitantes; turistas y excursionistas
   * tampoco, en las guardadas antes de la encuesta turística.
   */
  visitors?: { total: number; outsideAstrea: number; tourists?: number; excursionists?: number };
}

/** Resultado de un emprendedor en una feria guardada. No lleva teléfono ni cuenta bancaria. */
export interface EditionEntrepreneur {
  businessName: string;
  ownerName: string;
  document: string;
  section: string;
  days: EventDay[];
  training: boolean;
  kit: 'completo' | 'parcial' | 'pendiente';
  bonus: boolean;
  sales: { day1: number; day2: number };
}

export interface FairEdition {
  id: string;
  name: string;
  summary: EditionSummary;
  entrepreneurs: EditionEntrepreneur[];
  at: string;
  operator: string;
}

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
  pettyCash: {
    funds: PettyCashFund[];
    expenses: PettyCashExpense[];
    /** false si la base todavía no tiene las tablas de caja menor (falta ejecutar schema.sql). */
    installed: boolean;
  };
  activity: ActivityEntry[];
  visitors: {
    /** Del más reciente al más antiguo. */
    list: Visitor[];
    /** Si el formulario público del QR acepta registros. */
    open: boolean;
    /** false si la base todavía no tiene la tabla de visitantes (falta ejecutar schema.sql). */
    installed: boolean;
  };
  editions: {
    /** De la más reciente a la más antigua. */
    list: FairEdition[];
    /** false si la base todavía no tiene la tabla del historial (falta ejecutar schema.sql). */
    installed: boolean;
  };
}
