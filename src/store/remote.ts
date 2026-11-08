import { describeError, isMissingTable, supabase } from '../lib/supabase';
import { DEFAULT_TRAINING } from './seed';
import { commit, getState, setSyncStatus } from './fairStore';
import type {
  ActivityEntry,
  AttendanceRecord,
  EntrepreneurshipBonus,
  Entrepreneur,
  FairEdition,
  FairState,
  KitDelivery,
  LogisticsCheck,
  PettyCashExpense,
  PettyCashFund,
  SaleRecord,
  TrainingAttendance,
  TrainingInfo,
  Visitor,
} from './types';

// Filas tal como llegan de PostgREST, en snake_case.
type Row = Record<string, any>;

/* ---------- De filas de la base a los tipos de la app ---------- */

export const toEntrepreneur = (r: Row): Entrepreneur => ({
  id: r.id,
  document: r.document ?? '',
  ownerName: r.owner_name,
  businessName: r.business_name,
  phone: r.phone,
  category: r.category,
  section: r.section,
  stand: r.stand,
  // ?? true: mientras no se haya vuelto a ejecutar schema.sql la columna no existe.
  needsStand: r.needs_stand ?? true,
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

const toPettyCashFund = (r: Row): PettyCashFund => ({
  day: r.day,
  amount: Number(r.amount),
  at: r.at,
  operator: r.operator_name,
});

const toPettyCashExpense = (r: Row): PettyCashExpense => ({
  id: r.id,
  day: r.day,
  amount: Number(r.amount),
  category: r.category,
  description: r.description,
  at: r.at,
  operator: r.operator_name,
});

const toActivity = (r: Row): ActivityEntry => ({ id: r.id, at: r.at, kind: r.kind, message: r.message });

const toVisitor = (r: Row): Visitor => ({
  id: r.id,
  fullName: r.full_name,
  document: r.document,
  origin: r.origin,
  originDetail: r.origin_detail,
  at: r.at,
  visitDate: r.visit_date,
  phone: r.phone ?? '',
  groupSize: r.group_size ?? null,
  heardFrom: r.heard_from ?? null,
  tripPurpose: r.trip_purpose ?? null,
  nights: r.nights ?? null,
  lodging: r.lodging ?? null,
  transport: r.transport ?? null,
});

const toEdition = (r: Row): FairEdition => ({
  id: r.id,
  name: r.name,
  summary: r.summary,
  entrepreneurs: r.entrepreneurs ?? [],
  at: r.at,
  operator: r.operator_name,
});

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
  | 'pettyCash'
  | 'activity'
  | 'visitors'
  | 'editions';

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
  pettyCash: async () => {
    try {
      const [funds, expenses] = await Promise.all([fetchAll('petty_cash_funds', 'day'), fetchAll('petty_cash_expenses')]);
      const pettyCash = { funds: funds.map(toPettyCashFund), expenses: expenses.map(toPettyCashExpense), installed: true };
      return (s) => ({ ...s, pettyCash });
    } catch (error) {
      // Si la base todavía no tiene la caja menor, el resto de la app sigue funcionando.
      if (!isMissingTable(error)) throw error;
      return (s) => ({ ...s, pettyCash: { funds: [], expenses: [], installed: false } });
    }
  },
  activity: async () => {
    const { data, error } = await supabase.from('activity').select('*').order('at', { ascending: false }).limit(40);
    if (error) throw error;
    const rows = data.map(toActivity);
    return (s) => ({ ...s, activity: rows });
  },
  visitors: async () => {
    try {
      const [rows, settings] = await Promise.all([
        fetchAll('visitors'),
        supabase.from('app_settings').select('visitors_open').eq('id', 1).maybeSingle(),
      ]);
      if (settings.error) throw settings.error;
      const list = rows.map(toVisitor).sort((a, b) => b.at.localeCompare(a.at));
      const open = settings.data?.visitors_open ?? true;
      return (s) => ({ ...s, visitors: { list, open, installed: true } });
    } catch (error) {
      // Sin las tablas de visitantes, el resto de la app sigue funcionando.
      if (!isMissingTable(error)) throw error;
      return (s) => ({ ...s, visitors: { list: [], open: true, installed: false } });
    }
  },
  editions: async () => {
    const { data, error } = await supabase.from('fair_editions').select('*').order('at', { ascending: false });
    if (error) {
      // Sin la tabla del historial, el resto de la app sigue funcionando.
      if (!isMissingTable(error)) throw error;
      return (s) => ({ ...s, editions: { list: [], installed: false } });
    }
    const list = data.map(toEdition);
    return (s) => ({ ...s, editions: { list, installed: true } });
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

// La caja menor, el historial y los visitantes van en un canal aparte: si la base todavía no tiene sus tablas,
// el error de ese canal no corta el tiempo real de los demás módulos.
const CHANNELS: Record<string, Record<string, Slice>> = {
  'feria-datos': {
    entrepreneurs: 'entrepreneurs',
    attendance: 'attendance',
    training_info: 'trainingInfo',
    training_attendance: 'trainingAttendance',
    logistics_checks: 'logistics',
    kit_deliveries: 'kits',
    bonuses: 'bonuses',
    sales: 'sales',
    activity: 'activity',
  },
  'feria-modulos-nuevos': {
    petty_cash_funds: 'pettyCash',
    petty_cash_expenses: 'pettyCash',
    fair_editions: 'editions',
    visitors: 'visitors',
    app_settings: 'visitors',
  },
};

/**
 * Escucha los cambios que hacen otros equipos. Cuando llegan varios seguidos (por ejemplo
 * una carga masiva) se agrupan y se lee una sola vez. Al reconectarse después de perder la
 * señal se vuelve a leer todo, por si se perdió algún aviso.
 */
export function subscribeToChanges(): () => void {
  const pending = new Set<Slice>();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const schedule = (slice: Slice) => {
    pending.add(slice);
    clearTimeout(timer);
    timer = setTimeout(() => {
      const slices = [...pending];
      pending.clear();
      refreshQuietly(...slices);
    }, 250);
  };

  const channels = Object.entries(CHANNELS).map(([name, tables]) => {
    const channel = supabase.channel(name);
    for (const [table, slice] of Object.entries(tables)) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => schedule(slice));
    }
    let connectedBefore = false;
    channel.subscribe((status) => {
      if (status !== 'SUBSCRIBED') return;
      if (connectedBefore) ALL_SLICES.forEach(schedule);
      connectedBefore = true;
    });
    return channel;
  });

  return () => {
    clearTimeout(timer);
    for (const channel of channels) void supabase.removeChannel(channel);
  };
}
