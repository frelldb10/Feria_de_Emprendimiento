import { createId, randomToken } from '../lib/random';
import { commit, getState, withActivity } from './fairStore';
import { getBonusEligibility, type BonusEligibility } from './rules';
import { findByQrCode } from './selectors';
import type {
  AttendanceRecord,
  BankAccount,
  Entrepreneur,
  EntrepreneurshipBonus,
  EventDay,
  KitDelivery,
  KitItemId,
  LogisticsField,
  NewEntrepreneur,
  PhotoRef,
  RegistrationMethod,
  SaleCut,
  SaleRecord,
  SectionId,
  TrainingAttendance,
  TrainingInfo,
} from './types';

const now = () => new Date().toISOString();

/* ---------- Lectura de QR (puerta y capacitación) ---------- */

/** Resultado común de cualquier lector: sirve para pintar la pantalla verde o roja. */
export type ScanResult =
  | { status: 'ok'; entrepreneur: Entrepreneur; at: string }
  | { status: 'duplicate'; entrepreneur: Entrepreneur; previousAt: string; previousOperator: string }
  | { status: 'unknown'; code: string };

function resolveCode(code: string): Entrepreneur | ScanResult {
  const state = getState();
  const entrepreneur = findByQrCode(state, code);
  if (entrepreneur) return entrepreneur;
  commit(withActivity(state, 'unknown-code', `Código no reconocido: ${code.trim()}`));
  return { status: 'unknown', code: code.trim() };
}

const isResult = (value: Entrepreneur | ScanResult): value is ScanResult => 'status' in value;

/* ---------- Puerta ---------- */

export function registerAttendance(
  entrepreneurId: string,
  day: EventDay,
  operator: string,
  method: RegistrationMethod,
): ScanResult {
  const state = getState();
  const entrepreneur = state.entrepreneurs.find((e) => e.id === entrepreneurId);
  if (!entrepreneur) return { status: 'unknown', code: entrepreneurId };

  const previous = state.attendance.find((a) => a.entrepreneurId === entrepreneurId && a.day === day);
  if (previous) {
    commit(withActivity(state, 'duplicate', `Ingreso repetido bloqueado: ${entrepreneur.businessName} (Día ${day})`));
    return { status: 'duplicate', entrepreneur, previousAt: previous.at, previousOperator: previous.operator };
  }

  const record: AttendanceRecord = { id: createId('asi'), entrepreneurId, day, at: now(), operator, method };
  commit(
    withActivity(
      { ...state, attendance: [...state.attendance, record] },
      'attendance',
      `${entrepreneur.businessName} ingresó el Día ${day}`,
    ),
  );
  return { status: 'ok', entrepreneur, at: record.at };
}

export function registerAttendanceByCode(code: string, day: EventDay, operator: string): ScanResult {
  const resolved = resolveCode(code);
  return isResult(resolved) ? resolved : registerAttendance(resolved.id, day, operator, 'qr');
}

/* ---------- Capacitación ---------- */

export function registerTraining(entrepreneurId: string, operator: string, method: RegistrationMethod): ScanResult {
  const state = getState();
  const entrepreneur = state.entrepreneurs.find((e) => e.id === entrepreneurId);
  if (!entrepreneur) return { status: 'unknown', code: entrepreneurId };

  const previous = state.training.attendance.find((a) => a.entrepreneurId === entrepreneurId);
  if (previous) {
    commit(withActivity(state, 'duplicate', `Asistencia repetida a capacitación: ${entrepreneur.businessName}`));
    return { status: 'duplicate', entrepreneur, previousAt: previous.at, previousOperator: previous.operator };
  }

  const record: TrainingAttendance = { id: createId('cap'), entrepreneurId, at: now(), operator, method };
  commit(
    withActivity(
      { ...state, training: { ...state.training, attendance: [...state.training.attendance, record] } },
      'training',
      `${entrepreneur.businessName} asistió a la capacitación`,
    ),
  );
  return { status: 'ok', entrepreneur, at: record.at };
}

export function registerTrainingByCode(code: string, operator: string): ScanResult {
  const resolved = resolveCode(code);
  return isResult(resolved) ? resolved : registerTraining(resolved.id, operator, 'qr');
}

export function updateTrainingInfo(info: TrainingInfo): void {
  const state = getState();
  commit({ ...state, training: { ...state.training, info } });
}

/* ---------- Logística ---------- */

export function setLogisticsCheck(entrepreneurId: string, field: LogisticsField, value: boolean, operator: string): void {
  const state = getState();
  const current = state.logistics[entrepreneurId] ?? {
    standReady: false,
    powerConnected: false,
    chairsDelivered: false,
  };
  commit({
    ...state,
    logistics: {
      ...state.logistics,
      [entrepreneurId]: { ...current, [field]: value, updatedAt: now(), operator },
    },
  });
}

/** Registra la entrega del kit. Si ya había una (por ejemplo parcial), la reemplaza. */
export function registerKitDelivery(
  entrepreneurId: string,
  items: Record<KitItemId, boolean>,
  photo: PhotoRef,
  operator: string,
): KitDelivery {
  const state = getState();
  const entrepreneur = state.entrepreneurs.find((e) => e.id === entrepreneurId);
  const delivery: KitDelivery = { id: createId('kit'), entrepreneurId, items, photo, at: now(), operator };
  const complete = Object.values(items).every(Boolean);
  commit(
    withActivity(
      { ...state, kits: [...state.kits.filter((k) => k.entrepreneurId !== entrepreneurId), delivery] },
      'kit',
      `Kit ${complete ? 'entregado' : 'entregado parcialmente'} a ${entrepreneur?.businessName ?? 'emprendedor'}`,
    ),
  );
  return delivery;
}

/* ---------- Bono de emprendimiento ---------- */

export type BonusResult = { ok: true; bonus: EntrepreneurshipBonus } | { ok: false; eligibility: BonusEligibility };

/** Vuelve a validar la asistencia aquí, no solo en la pantalla, antes de guardar. */
export function registerBonus(entrepreneurId: string, account: BankAccount, operator: string): BonusResult {
  const state = getState();
  const eligibility = getBonusEligibility(state, entrepreneurId);
  if (!eligibility.ok) return { ok: false, eligibility };

  const entrepreneur = state.entrepreneurs.find((e) => e.id === entrepreneurId);
  const bonus: EntrepreneurshipBonus = {
    id: createId('bon'),
    entrepreneurId,
    account,
    dataConsent: true,
    verifiedDays: eligibility.attendance.map((a) => a.day),
    at: now(),
    operator,
  };
  commit(
    withActivity(
      { ...state, bonuses: [...state.bonuses, bonus] },
      'bonus',
      `Cuenta registrada para el bono de ${entrepreneur?.businessName ?? 'emprendedor'}`,
    ),
  );
  return { ok: true, bonus };
}

/** Corrige los datos de una cuenta ya registrada (por ejemplo, un número mal dictado). */
export function correctBonusAccount(bonusId: string, account: BankAccount, operator: string): EntrepreneurshipBonus | null {
  const state = getState();
  const current = state.bonuses.find((b) => b.id === bonusId);
  if (!current) return null;
  const updated: EntrepreneurshipBonus = { ...current, account, at: now(), operator };
  const entrepreneur = state.entrepreneurs.find((e) => e.id === current.entrepreneurId);
  commit(
    withActivity(
      { ...state, bonuses: state.bonuses.map((b) => (b.id === bonusId ? updated : b)) },
      'bonus',
      `Cuenta corregida para el bono de ${entrepreneur?.businessName ?? 'emprendedor'}`,
    ),
  );
  return updated;
}

/* ---------- Finanzas ---------- */

/** Guarda (o reemplaza) lo vendido por un emprendedor en un corte del día. */
export function recordSale(entrepreneurId: string, day: EventDay, cut: SaleCut, amount: number, operator: string): SaleRecord {
  const state = getState();
  const record: SaleRecord = { id: createId('ven'), entrepreneurId, day, cut, amount, at: now(), operator };
  commit({
    ...state,
    sales: [
      ...state.sales.filter((s) => !(s.entrepreneurId === entrepreneurId && s.day === day && s.cut === cut)),
      record,
    ],
  });
  return record;
}

/* ---------- Administración ---------- */

export function importEntrepreneurs(rows: NewEntrepreneur[]): number {
  if (rows.length === 0) return 0;
  const state = getState();
  const createdAt = now();
  const added: Entrepreneur[] = rows.map((row) => ({ ...row, id: createId('emp'), qrCode: null, createdAt }));
  commit(
    withActivity(
      { ...state, entrepreneurs: [...state.entrepreneurs, ...added] },
      'import',
      `Carga masiva: ${added.length} emprendedores nuevos`,
    ),
  );
  return added.length;
}

export function setEntrepreneurSection(entrepreneurId: string, section: SectionId | null): void {
  const state = getState();
  commit({
    ...state,
    entrepreneurs: state.entrepreneurs.map((e) => (e.id === entrepreneurId ? { ...e, section } : e)),
  });
}

/**
 * Asigna un código a cada emprendedor que no lo tiene. Formato FE-0001-K7QM: el consecutivo
 * sirve para ubicarlo a ojo y el sufijo aleatorio evita que alguien adivine códigos válidos.
 */
export function generateMissingQrCodes(): Entrepreneur[] {
  const state = getState();
  let sequence = state.entrepreneurs.reduce((max, e) => {
    const n = e.qrCode ? Number.parseInt(e.qrCode.split('-')[1], 10) : 0;
    return Number.isNaN(n) ? max : Math.max(max, n);
  }, 0);

  const generated: Entrepreneur[] = [];
  const entrepreneurs = state.entrepreneurs.map((e) => {
    if (e.qrCode) return e;
    sequence += 1;
    const updated = { ...e, qrCode: `FE-${String(sequence).padStart(4, '0')}-${randomToken(4)}` };
    generated.push(updated);
    return updated;
  });
  if (generated.length === 0) return [];

  commit(withActivity({ ...state, entrepreneurs }, 'qr', `Se generaron ${generated.length} códigos QR`));
  return generated;
}
