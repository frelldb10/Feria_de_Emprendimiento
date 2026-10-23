import { describeError, supabase } from '../lib/supabase';
import { DEFAULT_TRAINING } from './seed';
import { commit, getState, setSyncStatus } from './fairStore';
import type {
  ActivityEntry,
  AttendanceRecord,
  EntrepreneurshipBonus,
  Entrepreneur,
  FairState,
  KitDelivery,
  LogisticsCheck,
  SaleRecord,
  TrainingAttendance,
  TrainingInfo,
} from './types';

// Filas tal como llegan de PostgREST, en snake_case.
type Row = Record<string, any>;

/* ---------- De filas de la base a los tipos de la app ---------- */

export const toEntrepreneur = (r: Row): Entrepreneur => ({
  id: r.id,
  document: r.document,
  ownerName: r.owner_name,
  businessName: r.business_name,
  phone: r.phone,
  category: r.category,
  section: r.section,
  stand: r.stand,
  needsPower: r.needs_power,
  chairs: r.chairs,
  qrCode: r.qr_code,
  createdAt: r.created_at,
});

const toAttendance = (r: Row): AttendanceRecord => ({
  id: r.id,
  entrepreneurId: r.entrepreneur_id,
  day: r.day,
  at: r.at,
  operator: r.operator_name,
  method: r.method,
});

const toTrainingAttendance = (r: Row): TrainingAttendance => ({
  id: r.id,
  entrepreneurId: r.entrepreneur_id,
  at: r.at,
  operator: r.operator_name,
  method: r.method,
});

const toTrainingInfo = (r: Row | undefined): TrainingInfo =>
  r ? { title: r.title, date: r.date ?? '', place: r.place } : { ...DEFAULT_TRAINING };

const toLogistics = (r: Row): LogisticsCheck => ({
  standReady: r.stand_ready,
  powerConnected: r.power_connected,
  chairsDelivered: r.chairs_delivered,
  updatedAt: r.at,
  operator: r.operator_name,
});

export const toKit = (r: Row): KitDelivery => ({
  id: r.id,
  entrepreneurId: r.entrepreneur_id,
  items: { gorras: r.gorras, sueteres: r.sueteres, pendon: r.pendon },
  photo: { path: r.photo_path, fileName: r.photo_name, sizeKb: r.photo_size_kb },
  at: r.at,
  operator: r.operator_name,
});

export const toBonus = (r: Row): EntrepreneurshipBonus => ({
  id: r.id,
  entrepreneurId: r.entrepreneur_id,
  account: {
    bank: r.bank,
    type: r.account_type,
    number: r.account_number,
    holderName: r.holder_name,
    holderDocument: r.holder_document,
  },
  dataConsent: true,
  verifiedDays: r.verified_days ?? [],
  at: r.at,
  operator: r.operator_name,
});

const toSale = (r: Row): SaleRecord => ({
  id: r.id,
  entrepreneurId: r.entrepreneur_id,
  day: r.day,
  cut: r.cut,
  amount: Number(r.amount),
  at: r.at,
  operator: r.operator_name,
});

const toActivity = (r: Row): ActivityEntry => ({ id: r.id, at: r.at, kind: r.kind, message: r.message });

/* ---------- Lectura ---------- */

/** PostgREST devuelve máximo 1000 filas por consulta; se pide por páginas. */
async function fetchAll(table: string, orderBy = 'id'): Promise<Row[]> {
  const page = 1000;
  const rows: Row[] = [];
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase.from(table).select('*').order(orderBy).range(from, from + page - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < page) return rows;
  }
}

export type Slice =
  | 'entrepreneurs'
  | 'attendance'
  | 'trainingInfo'
  | 'trainingAttendance'
  | 'logistics'
  | 'kits'
  | 'bonuses'
  | 'sales'
  | 'activity';

type Updater = (state: FairState) => FairState;

const loaders: Record<Slice, () => Promise<Updater>> = {
  entrepreneurs: async () => {
    const rows = (await fetchAll('entrepreneurs')).map(toEntrepreneur);
    return (s) => ({ ...s, entrepreneurs: rows });
  },
  attendance: async () => {
    const rows = (await fetchAll('attendance')).map(toAttendance);
    return (s) => ({ ...s, attendance: rows });
  },
  trainingInfo: async () => {
    const { data, error } = await supabase.from('training_info').select('*').eq('id', 1).maybeSingle();
    if (error) throw error;
    const info = toTrainingInfo(data ?? undefined);
    return (s) => ({ ...s, training: { ...s.training, info } });
  },
  trainingAttendance: async () => {
    const rows = (await fetchAll('training_attendance')).map(toTrainingAttendance);
    return (s) => ({ ...s, training: { ...s.training, attendance: rows } });
  },
  logistics: async () => {
    const rows = await fetchAll('logistics_checks', 'entrepreneur_id');
    const logistics = Object.fromEntries(rows.map((r) => [r.entrepreneur_id as string, toLogistics(r)]));
    return (s) => ({ ...s, logistics });
  },
  kits: async () => {
    const rows = (await fetchAll('kit_deliveries')).map(toKit);
    return (s) => ({ ...s, kits: rows });
  },
  bonuses: async () => {
    const rows = (await fetchAll('bonuses')).map(toBonus);
    return (s) => ({ ...s, bonuses: rows });
  },
  sales: async () => {
    const rows = (await fetchAll('sales')).map(toSale);
    return (s) => ({ ...s, sales: rows });
  },
  activity: async () => {
    const { data, error } = await supabase.from('activity').select('*').order('at', { ascending: false }).limit(40);
    if (error) throw error;
    const rows = data.map(toActivity);
    return (s) => ({ ...s, activity: rows });
  },
};

const ALL_SLICES = Object.keys(loaders) as Slice[];

/** Vuelve a leer del servidor las partes indicadas y las aplica sobre el estado más reciente. */
export async function refresh(...slices: Slice[]): Promise<void> {
  const updates = await Promise.all(slices.map((slice) => loaders[slice]()));
  commit(updates.reduce((state, apply) => apply(state), getState()));
}

/** Refresco en segundo plano después de guardar: si falla, el tiempo real lo corrige luego. */
export function refreshQuietly(...slices: Slice[]): void {
  refresh(...slices).catch(() => undefined);
}

export async function loadAll(): Promise<void> {
  setSyncStatus({ phase: 'loading' });
  try {
    await refresh(...ALL_SLICES);
    setSyncStatus({ phase: 'ready' });
  } catch (error) {
    setSyncStatus({ phase: 'error', message: describeError(error) });
  }
}

/* ---------- Tiempo real ---------- */

const TABLE_SLICE: Record<string, Slice> = {
  entrepreneurs: 'entrepreneurs',
  attendance: 'attendance',
  training_info: 'trainingInfo',
  training_attendance: 'trainingAttendance',
  logistics_checks: 'logistics',
  kit_deliveries: 'kits',
  bonuses: 'bonuses',
  sales: 'sales',
  activity: 'activity',
};

/**
 * Escucha los cambios que hacen otros equipos. Cuando llegan varios seguidos (por ejemplo
 * una carga masiva) se agrupan y se lee una sola vez. Al reconectarse después de perder la
 * señal se vuelve a leer todo, por si se perdió algún aviso.
 */
export function subscribeToChanges(): () => void {
  const pending = new Set<Slice>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let connectedBefore = false;

  const schedule = (slice: Slice) => {
    pending.add(slice);
    clearTimeout(timer);
    timer = setTimeout(() => {
      const slices = [...pending];
      pending.clear();
      refreshQuietly(...slices);
    }, 250);
  };

  const channel = supabase.channel('feria-datos');
  for (const [table, slice] of Object.entries(TABLE_SLICE)) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => schedule(slice));
  }
  channel.subscribe((status) => {
    if (status !== 'SUBSCRIBED') return;
    if (connectedBefore) ALL_SLICES.forEach(schedule);
    connectedBefore = true;
  });

  return () => {
    clearTimeout(timer);
    void supabase.removeChannel(channel);
  };
}
