import { normalizeText } from '../lib/format';
import type { AttendanceRecord, Entrepreneur, EventDay, FairState, KitDelivery } from './types';

export type AttendanceByDay = Partial<Record<EventDay, AttendanceRecord>>;

export function indexAttendance(attendance: AttendanceRecord[]): Map<string, AttendanceByDay> {
  const index = new Map<string, AttendanceByDay>();
  for (const record of attendance) {
    const entry = index.get(record.entrepreneurId) ?? {};
    entry[record.day] = record;
    index.set(record.entrepreneurId, entry);
  }
  return index;
}

export function indexKits(kits: KitDelivery[]): Map<string, KitDelivery> {
  return new Map(kits.map((kit) => [kit.entrepreneurId, kit]));
}

export function indexEntrepreneurs(entrepreneurs: Entrepreneur[]): Map<string, Entrepreneur> {
  return new Map(entrepreneurs.map((e) => [e.id, e]));
}

export function isKitComplete(kit: KitDelivery | undefined): boolean {
  return !!kit && Object.values(kit.items).every(Boolean);
}

export function findByQrCode(state: FairState, code: string): Entrepreneur | undefined {
  const wanted = code.trim().toUpperCase();
  return state.entrepreneurs.find((e) => e.qrCode === wanted);
}

export interface FairMetrics {
  entrepreneurs: number;
  pendingQr: number;
  attendees: number;
  attendeesByDay: Record<EventDay, number>;
  kitsComplete: number;
  kitsPartial: number;
  trainingAttendees: number;
  bonusAccounts: number;
  /** Asistentes a la feria que todavía no tienen cuenta registrada para el bono. */
  bonusPending: number;
  salesTotal: number;
  salesByDay: Record<EventDay, number>;
}

export function computeMetrics(state: FairState): FairMetrics {
  const kits = state.kits.filter((k) => isKitComplete(k)).length;
  const attendees = new Set(state.attendance.map((a) => a.entrepreneurId));
  const withBonus = new Set(state.bonuses.map((b) => b.entrepreneurId));
  const salesOf = (day: EventDay) => state.sales.filter((s) => s.day === day).reduce((sum, s) => sum + s.amount, 0);
  return {
    entrepreneurs: state.entrepreneurs.length,
    pendingQr: state.entrepreneurs.filter((e) => !e.qrCode).length,
    attendees: attendees.size,
    attendeesByDay: {
      1: state.attendance.filter((a) => a.day === 1).length,
      2: state.attendance.filter((a) => a.day === 2).length,
    },
    kitsComplete: kits,
    kitsPartial: state.kits.length - kits,
    trainingAttendees: state.training.attendance.length,
    bonusAccounts: state.bonuses.length,
    bonusPending: [...attendees].filter((id) => !withBonus.has(id)).length,
    salesTotal: salesOf(1) + salesOf(2),
    salesByDay: { 1: salesOf(1), 2: salesOf(2) },
  };
}

/** Busca por nombre, emprendimiento, documento, stand o código QR. */
export function searchEntrepreneurs(list: Entrepreneur[], query: string, limit = 8): Entrepreneur[] {
  const q = normalizeText(query);
  if (q.length < 2) return [];
  const digits = q.replace(/\D/g, '');
  return list
    .filter((e) => {
      if (digits.length >= 3 && e.document.includes(digits)) return true;
      return (
        normalizeText(e.ownerName).includes(q) ||
        normalizeText(e.businessName).includes(q) ||
        normalizeText(e.stand) === q ||
        (e.qrCode !== null && e.qrCode.toLowerCase() === q)
      );
    })
    .slice(0, limit);
}
