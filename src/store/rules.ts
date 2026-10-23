import type { AttendanceRecord, EntrepreneurshipBonus, FairState } from './types';

export type BonusEligibility =
  | { ok: true; attendance: AttendanceRecord[] }
  | { ok: false; reason: 'no-attendance' }
  | { ok: false; reason: 'already-registered'; bonus: EntrepreneurshipBonus };

/**
 * Regla del bono de emprendimiento: el emprendedor debe tener ingreso registrado en puerta
 * el Día 1, el Día 2 o ambos, y se registra una sola cuenta por emprendedor.
 */
export function getBonusEligibility(state: FairState, entrepreneurId: string): BonusEligibility {
  const bonus = state.bonuses.find((b) => b.entrepreneurId === entrepreneurId);
  if (bonus) return { ok: false, reason: 'already-registered', bonus };

  const attendance = state.attendance
    .filter((a) => a.entrepreneurId === entrepreneurId)
    .sort((a, b) => a.day - b.day);
  if (attendance.length === 0) return { ok: false, reason: 'no-attendance' };

  return { ok: true, attendance };
}
