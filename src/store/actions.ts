import { compressImage } from '../lib/image';
import { photoFileName } from '../lib/photo';
import { ActionError, describeError, supabase } from '../lib/supabase';
import { getState } from './fairStore';
import { refresh, refreshQuietly, toBonus, toEntrepreneur, toKit } from './remote';
import { DEMO_ENTREPRENEURS } from './seed';
import { findByQrCode } from './selectors';
import type {
  ActivityKind,
  BankAccount,
  Entrepreneur,
  EntrepreneurshipBonus,
  EventDay,
  KitDelivery,
  KitItemId,
  LogisticsField,
  NewEntrepreneur,
  RegistrationMethod,
  SaleCut,
  SectionId,
  TrainingInfo,
} from './types';

/*
  Todas las escrituras van al servidor. Quién registró y a qué hora lo pone la base de datos,
  no el celular. Cada acción lanza ActionError con un mensaje listo para mostrar.
*/

async function run<T>(operation: () => PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  let result: { data: T; error: unknown };
  try {
    result = await operation();
  } catch (error) {
    throw new ActionError(describeError(error));
  }
  if (result.error) throw new ActionError(describeError(result.error));
  return result.data;
}

/** El historial de actividad es informativo: si no se puede guardar, no se interrumpe nada. */
function logActivity(kind: ActivityKind, message: string): void {
  void supabase
    .from('activity')
    .insert({ kind, message })
    .then(() => undefined, () => undefined);
}

/* ---------- Lectura de QR (puerta y capacitación) ---------- */

/** Resultado común de cualquier lector: sirve para pintar la pantalla verde o roja. */
export type ScanResult =
  | { status: 'ok'; entrepreneur: Entrepreneur; at: string }
  | { status: 'duplicate'; entrepreneur: Entrepreneur; previousAt: string; previousOperator: string }
  | { status: 'unknown'; code: string }
  | { status: 'error'; message: string };

type RegisterReply = { status: 'ok' | 'duplicate'; at: string; operator?: string };

/** Busca el código en la copia local y, si no está (pudo generarse hace un momento), en el servidor. */
async function resolveCode(code: string): Promise<Entrepreneur | null> {
  const cached = findByQrCode(getState(), code);
  if (cached) return cached;
  const row = await run(() => supabase.from('entrepreneurs').select('*').eq('qr_code', code.trim().toUpperCase()).maybeSingle());
  if (row) refreshQuietly('entrepreneurs');
  return row ? toEntrepreneur(row) : null;
}

async function scan(
  entrepreneurId: string,
  register: () => PromiseLike<{ data: unknown; error: unknown }>,
  messages: { ok: (name: string) => string; duplicate: (name: string) => string },
  slice: 'attendance' | 'trainingAttendance',
): Promise<ScanResult> {
  const entrepreneur = getState().entrepreneurs.find((e) => e.id === entrepreneurId);
  if (!entrepreneur) return { status: 'unknown', code: entrepreneurId };
  try {
    const reply = (await run(register)) as RegisterReply;
    if (reply.status === 'ok') {
      logActivity(slice === 'attendance' ? 'attendance' : 'training', messages.ok(entrepreneur.businessName));
      refreshQuietly(slice);
      return { status: 'ok', entrepreneur, at: reply.at };
    }
    logActivity('duplicate', messages.duplicate(entrepreneur.businessName));
    return { status: 'duplicate', entrepreneur, previousAt: reply.at, previousOperator: reply.operator ?? '' };
  } catch (error) {
    return { status: 'error', message: describeError(error) };
  }
}

async function scanByCode(code: string, registerFor: (id: string) => Promise<ScanResult>): Promise<ScanResult> {
  const clean = code.trim().toUpperCase();
  try {
    const entrepreneur = await resolveCode(clean);
    if (!entrepreneur) {
      logActivity('unknown-code', `Código no reconocido: ${clean}`);
      return { status: 'unknown', code: clean };
    }
    return registerFor(entrepreneur.id);
  } catch (error) {
    return { status: 'error', message: describeError(error) };
  }
}

/* ---------- Puerta ---------- */

export function registerAttendance(entrepreneurId: string, day: EventDay, method: RegistrationMethod): Promise<ScanResult> {
  return scan(
    entrepreneurId,
    () => supabase.rpc('register_attendance', { p_entrepreneur_id: entrepreneurId, p_day: day, p_method: method }),
    {
      ok: (name) => `${name} ingresó el Día ${day}`,
      duplicate: (name) => `Ingreso repetido bloqueado: ${name} (Día ${day})`,
    },
    'attendance',
  );
}

export function registerAttendanceByCode(code: string, day: EventDay): Promise<ScanResult> {
  return scanByCode(code, (id) => registerAttendance(id, day, 'qr'));
}

/* ---------- Capacitación ---------- */

export function registerTraining(entrepreneurId: string, method: RegistrationMethod): Promise<ScanResult> {
  return scan(
    entrepreneurId,
    () => supabase.rpc('register_training', { p_entrepreneur_id: entrepreneurId, p_method: method }),
    {
      ok: (name) => `${name} asistió a la capacitación`,
      duplicate: (name) => `Asistencia repetida a capacitación: ${name}`,
    },
    'trainingAttendance',
  );
}

export function registerTrainingByCode(code: string): Promise<ScanResult> {
  return scanByCode(code, (id) => registerTraining(id, 'qr'));
}

export async function updateTrainingInfo(info: TrainingInfo): Promise<void> {
  await run(() =>
    supabase
      .from('training_info')
      .update({ title: info.title, date: info.date || null, place: info.place })
      .eq('id', 1),
  );
  await refresh('trainingInfo');
}

/* ---------- Logística ---------- */

const LOGISTICS_COLUMN: Record<LogisticsField, string> = {
  standReady: 'stand_ready',
  powerConnected: 'power_connected',
  chairsDelivered: 'chairs_delivered',
};

export async function setLogisticsCheck(entrepreneurId: string, field: LogisticsField, value: boolean): Promise<void> {
  await run(() =>
    supabase
      .from('logistics_checks')
      .upsert({ entrepreneur_id: entrepreneurId, [LOGISTICS_COLUMN[field]]: value }, { onConflict: 'entrepreneur_id' }),
  );
  await refresh('logistics');
}

/** Sube la foto (achicada) y registra la entrega. Si ya había una (por ejemplo parcial), la reemplaza. */
export async function registerKitDelivery(
  entrepreneur: Entrepreneur,
  items: Record<KitItemId, boolean>,
  photo: File,
): Promise<KitDelivery> {
  const image = await compressImage(photo);
  const fileName = photoFileName('kit', entrepreneur.qrCode ?? entrepreneur.document);
  const path = `kits/${fileName}`;
  await run(() => supabase.storage.from('evidencias').upload(path, image, { contentType: 'image/jpeg', upsert: false }));

  const row = await run(() =>
    supabase
      .from('kit_deliveries')
      .upsert(
        {
          entrepreneur_id: entrepreneur.id,
          gorras: items.gorras,
          sueteres: items.sueteres,
          pendon: items.pendon,
          photo_path: path,
          photo_name: fileName,
          photo_size_kb: Math.round(image.size / 1024),
        },
        { onConflict: 'entrepreneur_id' },
      )
      .select()
      .single(),
  );
  const complete = Object.values(items).every(Boolean);
  logActivity('kit', `Kit ${complete ? 'entregado' : 'entregado parcialmente'} a ${entrepreneur.businessName}`);
  await refresh('kits');
  return toKit(row);
}

/** Enlace temporal (10 minutos) para ver una foto de evidencia. */
export async function getEvidenceUrl(path: string): Promise<string> {
  const data = await run(() => supabase.storage.from('evidencias').createSignedUrl(path, 600));
  if (!data) throw new ActionError('No se encontró la foto.');
  return data.signedUrl;
}

/* ---------- Bono de emprendimiento ---------- */

const accountColumns = (account: BankAccount) => ({
  bank: account.bank,
  account_type: account.type,
  account_number: account.number,
  holder_name: account.holderName,
  holder_document: account.holderDocument,
});

/** La base vuelve a comprobar la asistencia antes de guardar (no basta con la pantalla). */
export async function registerBonus(entrepreneur: Entrepreneur, account: BankAccount): Promise<EntrepreneurshipBonus> {
  const row = await run(() =>
    supabase
      .from('bonuses')
      .insert({ entrepreneur_id: entrepreneur.id, ...accountColumns(account), data_consent: true })
      .select()
      .single(),
  ).catch((error: ActionError) => {
    throw error.message === 'Ese registro ya existe.' ? new ActionError('Este emprendedor ya tiene una cuenta registrada.') : error;
  });
  logActivity('bonus', `Cuenta registrada para el bono de ${entrepreneur.businessName}`);
  await refresh('bonuses');
  return toBonus(row);
}

/** Corrige los datos de una cuenta ya registrada (por ejemplo, un número mal dictado). */
export async function correctBonusAccount(
  bonus: EntrepreneurshipBonus,
  entrepreneur: Entrepreneur,
  account: BankAccount,
): Promise<EntrepreneurshipBonus> {
  const row = await run(() => supabase.from('bonuses').update(accountColumns(account)).eq('id', bonus.id).select().single());
  logActivity('bonus', `Cuenta corregida para el bono de ${entrepreneur.businessName}`);
  await refresh('bonuses');
  return toBonus(row);
}

/* ---------- Finanzas ---------- */

/** Guarda (o reemplaza) lo vendido por un emprendedor en un corte del día. */
export async function recordSale(entrepreneurId: string, day: EventDay, cut: SaleCut, amount: number): Promise<void> {
  await run(() =>
    supabase
      .from('sales')
      .upsert({ entrepreneur_id: entrepreneurId, day, cut, amount }, { onConflict: 'entrepreneur_id,day,cut' }),
  );
  await refresh('sales');
}

/* ---------- Administración ---------- */

/** Carga solo los documentos nuevos; los que ya existen se ignoran. Devuelve cuántos entraron. */
export async function importEntrepreneurs(rows: NewEntrepreneur[]): Promise<number> {
  if (rows.length === 0) return 0;
  const inserted = await run(() =>
    supabase
      .from('entrepreneurs')
      .upsert(
        rows.map((r) => ({
          document: r.document,
          owner_name: r.ownerName,
          business_name: r.businessName,
          phone: r.phone,
          category: r.category,
          section: r.section,
          stand: r.stand,
          needs_power: r.needsPower,
          chairs: r.chairs,
        })),
        { onConflict: 'document', ignoreDuplicates: true },
      )
      .select('id'),
  );
  const added = inserted?.length ?? 0;
  if (added > 0) logActivity('import', `Carga masiva: ${added} emprendedores nuevos`);
  await refresh('entrepreneurs');
  return added;
}

export async function setEntrepreneurSection(entrepreneurId: string, section: SectionId | null): Promise<void> {
  await run(() => supabase.from('entrepreneurs').update({ section }).eq('id', entrepreneurId));
  await refresh('entrepreneurs');
}

/**
 * Asigna un código a cada emprendedor que no lo tiene, en el servidor para que dos
 * administradores no generen el mismo. Formato FE-0001-K7QM.
 */
export async function generateMissingQrCodes(): Promise<Entrepreneur[]> {
  const rows = await run(() => supabase.rpc('generate_missing_qr_codes'));
  const generated = (rows as Record<string, unknown>[]).map(toEntrepreneur);
  if (generated.length > 0) logActivity('qr', `Se generaron ${generated.length} códigos QR`);
  await refresh('entrepreneurs');
  return generated;
}

/** Los 24 emprendedores de prueba, con su QR. Útil para ensayar antes de cargar el Excel real. */
export async function loadDemoEntrepreneurs(): Promise<number> {
  const added = await importEntrepreneurs(DEMO_ENTREPRENEURS);
  await generateMissingQrCodes();
  return added;
}

/** Borra los datos de la feria (no las cuentas de usuario ni las fotos ya subidas). */
export async function clearAllData(): Promise<void> {
  await run(() => supabase.rpc('clear_fair_data'));
  await refresh('entrepreneurs', 'attendance', 'trainingInfo', 'trainingAttendance', 'logistics', 'kits', 'bonuses', 'sales', 'activity');
}
