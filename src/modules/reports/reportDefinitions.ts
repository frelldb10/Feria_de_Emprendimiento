import { ChartColumn, ClipboardList, GraduationCap, Landmark, Luggage, PackageCheck, UserRoundCheck, Users, Wallet, type LucideIcon } from 'lucide-react';
import { fileStamp, formatDateOnly, formatForExport } from '../../lib/format';
import { downloadWorkbook, type ColumnSpec, type SheetSpec } from '../../lib/xlsx';
import { SECTIONS, sectionLabel } from '../../store/sections';
import { indexAttendance, indexEntrepreneurs, indexKits, isKitComplete } from '../../store/selectors';
import type { Entrepreneur, FairState, SectionId } from '../../store/types';
import { ACCOUNT_TYPE_LABEL } from '../bonuses/bankAccount';
import { buildSalesSheets } from '../finance/balance';
import { buildCurrentFairSheets } from '../history/edition';
import { KIT_ITEMS } from '../logistics/kit';
import { buildPettyCashSheets } from '../pettyCash/pettyCashReport';
import { buildTourismSheets } from '../visitors/tourismReport';
import { buildVisitorSheets } from '../visitors/visitorsReport';

export type ReportId = 'general' | 'asistencia' | 'capacitacion' | 'kits' | 'bonos' | 'ventas' | 'caja-menor' | 'visitantes' | 'turismo';
export type ReportGroup = 'general' | 'operacion' | 'finanzas' | 'publico';

export interface ReportDefinition {
  id: ReportId;
  group: ReportGroup;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Hojas que trae el archivo, en el orden en que aparecen. */
  contents: string[];
  count: (state: FairState) => number;
  sheets: (state: FairState) => SheetSpec[];
}

const yesNo = (value: boolean) => (value ? 'Sí' : 'No');
const missing = { document: '', ownerName: 'Emprendedor eliminado', businessName: '', stand: '', section: null } as unknown as Entrepreneur;
const method = (m: 'qr' | 'manual') => (m === 'qr' ? 'QR' : 'Manual');
const share = (part: number, total: number) => ({ value: total > 0 ? part / total : 0, percent: true });

const personColumns: ColumnSpec[] = [
  { header: 'Documento', text: true, width: 14 },
  { header: 'Emprendedor', width: 28 },
  { header: 'Emprendimiento', width: 30 },
  { header: 'Sección', width: 22 },
];
const personCells = (e: Entrepreneur) => [e.document, e.ownerName, e.businessName, sectionLabel(e.section)];
const bySectionThenName = (a: Entrepreneur, b: Entrepreneur) =>
  sectionLabel(a.section).localeCompare(sectionLabel(b.section)) || a.businessName.localeCompare(b.businessName);

/** Secciones con emprendedores ("Sin sección" solo si alguien quedó sin asignar). */
function sectionsWithPeople(state: FairState): Array<{ key: SectionId | null; label: string; people: Entrepreneur[] }> {
  return [...SECTIONS.map((s) => s.id), null]
    .map((key) => ({ key, label: sectionLabel(key), people: state.entrepreneurs.filter((e) => e.section === key) }))
    .filter((s) => s.key !== null || s.people.length > 0);
}

export const REPORTS: ReportDefinition[] = [
  {
    id: 'general',
    group: 'general',
    title: 'Informe general de la feria',
    description: 'Todas las cifras de la feria en un solo archivo: participación, capacitación, kits, bonos, ventas, visitantes y caja menor.',
    icon: ClipboardList,
    contents: ['Resumen general', 'Emprendedores'],
    count: (state) => state.entrepreneurs.length,
    sheets: buildCurrentFairSheets,
  },
  {
    id: 'asistencia',
    group: 'operacion',
    title: 'Asistencia a la feria',
    description: 'Cada ingreso registrado en puerta, por día, con el resumen por sección.',
    icon: Users,
    contents: ['Resumen por sección', 'Detalle de ingresos'],
    count: (state) => state.attendance.length,
    sheets: (state) => {
      const people = indexEntrepreneurs(state.entrepreneurs);
      const byPerson = indexAttendance(state.attendance);
      const came = (e: Entrepreneur, day?: 1 | 2) => {
        const days = byPerson.get(e.id);
        return day ? Boolean(days?.[day]) : Boolean(days?.[1] || days?.[2]);
      };
      const sections = sectionsWithPeople(state);
      const total = state.entrepreneurs.length;
      const attended = state.entrepreneurs.filter((e) => came(e)).length;
      const count = (list: Entrepreneur[], day?: 1 | 2) => list.filter((e) => came(e, day)).length;

      const summary: SheetSpec = {
        name: 'Resumen por sección',
        title: 'Resumen de asistencia por sección',
        highlights: [
          { label: 'Emprendedores inscritos', value: total, tone: 'neutral' },
          { label: 'Asistieron', value: attended },
          { label: 'Asistencia', value: total > 0 ? attended / total : 0, percent: true, tone: 'amarillo' },
          { label: 'No han asistido', value: total - attended, tone: 'rojo' },
        ],
        columns: [
          { header: 'Sección', width: 28 },
          { header: 'Inscritos', width: 12 },
          { header: 'Ingresaron Día 1', width: 14 },
          { header: 'Ingresaron Día 2', width: 14 },
          { header: 'Asistieron (algún día)', width: 16 },
          { header: 'Asistencia', percent: true, width: 12 },
        ],
        rows: sections.map((s) => [s.label, s.people.length, count(s.people, 1), count(s.people, 2), count(s.people), share(count(s.people), s.people.length)]),
        totals: ['Total', total, count(state.entrepreneurs, 1), count(state.entrepreneurs, 2), attended, share(attended, total)],
        emptyText: 'Todavía no hay emprendedores inscritos.',
      };

      const detail: SheetSpec = {
        name: 'Detalle de ingresos',
        title: 'Cada ingreso registrado en puerta',
        columns: [
          { header: 'Día', width: 8, center: true },
          { header: 'Fecha y hora', width: 17 },
          ...personColumns,
          { header: 'Stand', width: 8, center: true },
          { header: 'Registro', width: 10, center: true },
          { header: 'Registrado por', width: 22 },
        ],
        rows: [...state.attendance]
          .sort((a, b) => a.day - b.day || a.at.localeCompare(b.at))
          .map((a) => {
            const e = people.get(a.entrepreneurId) ?? missing;
            return [`Día ${a.day}`, formatForExport(a.at), ...personCells(e), e.stand, method(a.method), a.operator];
          }),
        emptyText: 'Todavía no se ha registrado ningún ingreso en puerta.',
      };
      return [summary, detail];
    },
  },
  {
    id: 'capacitacion',
    group: 'operacion',
    title: 'Asistencia a capacitación',
    description: 'Evidencia de quiénes asistieron y quiénes faltaron.',
    icon: GraduationCap,
    contents: ['Asistieron', 'No asistieron'],
    count: (state) => state.training.attendance.length,
    sheets: (state) => {
      const { info, attendance } = state.training;
      const people = indexEntrepreneurs(state.entrepreneurs);
      const attended = new Set(attendance.map((a) => a.entrepreneurId));
      const total = state.entrepreneurs.length;
      const absent = state.entrepreneurs.filter((e) => !attended.has(e.id)).sort(bySectionThenName);
      const notes = [
        `Capacitación: ${info.title}`,
        `Fecha: ${info.date ? formatDateOnly(info.date) : 'sin definir'}    ·    Lugar: ${info.place || 'sin definir'}`,
      ];
      return [
        {
          name: 'Asistieron',
          title: 'Emprendedores que asistieron',
          notes,
          highlights: [
            { label: 'Asistieron', value: attendance.length },
            { label: 'No asistieron', value: absent.length, tone: 'rojo' },
            { label: 'Asistencia', value: total > 0 ? attendance.length / total : 0, percent: true, tone: 'amarillo' },
          ],
          columns: [
            { header: 'N°', width: 6, center: true },
            { header: 'Fecha y hora', width: 17 },
            ...personColumns,
            { header: 'Registro', width: 10, center: true },
            { header: 'Registrado por', width: 22 },
          ],
          rows: [...attendance]
            .sort((a, b) => a.at.localeCompare(b.at))
            .map((a, i) => {
              const e = people.get(a.entrepreneurId) ?? missing;
              return [i + 1, formatForExport(a.at), ...personCells(e), method(a.method), a.operator];
            }),
          emptyText: 'Todavía no se ha registrado asistencia a la capacitación.',
        },
        {
          name: 'No asistieron',
          title: 'Emprendedores que no asistieron',
          notes: [`Capacitación: ${info.title}`],
          columns: [{ header: 'N°', width: 6, center: true }, ...personColumns, { header: 'Teléfono', text: true, width: 14 }],
          rows: absent.map((e, i) => [i + 1, ...personCells(e), e.phone]),
          emptyText: 'Todos los emprendedores asistieron a la capacitación.',
        },
      ];
    },
  },
  {
    id: 'kits',
    group: 'operacion',
    title: 'Kits',
    description: 'Entregas de gorras, suéteres y pendón por emprendedor. También hay un informe en Word con firmas.',
    icon: PackageCheck,
    contents: ['Entregas', 'Sin kit'],
    count: (state) => state.kits.length,
    sheets: (state) => {
      const people = indexEntrepreneurs(state.entrepreneurs);
      const kits = indexKits(state.kits);
      const complete = state.kits.filter((k) => isKitComplete(k)).length;
      const withoutKit = state.entrepreneurs.filter((e) => !kits.has(e.id)).sort(bySectionThenName);
      return [
        {
          name: 'Entregas',
          title: 'Entregas de kits',
          notes: ['Cada kit incluye gorras, suéteres y pendón. La entrega es completa cuando se entregaron los tres elementos.'],
          highlights: [
            { label: 'Kits completos', value: complete },
            { label: 'Entregas parciales', value: state.kits.length - complete, tone: 'amarillo' },
            { label: 'Sin entrega', value: withoutKit.length, tone: 'rojo' },
          ],
          columns: [
            { header: 'Fecha y hora', width: 17 },
            ...personColumns,
            ...KIT_ITEMS.map((item) => ({ header: item.label, width: 10, badge: true })),
            { header: 'Estado', width: 11, badge: true },
            { header: 'Foto de evidencia', width: 40 },
            { header: 'Entregó', width: 22 },
          ],
          rows: [...state.kits]
            .sort((a, b) => a.at.localeCompare(b.at))
            .map((k) => {
              const e = people.get(k.entrepreneurId) ?? missing;
              return [
                formatForExport(k.at),
                ...personCells(e),
                ...KIT_ITEMS.map((item) => yesNo(k.items[item.id])),
                isKitComplete(k) ? 'Completo' : 'Parcial',
                k.photo.fileName,
                k.operator,
              ];
            }),
          emptyText: 'Todavía no se ha registrado ninguna entrega.',
        },
        {
          name: 'Sin kit',
          title: 'Emprendedores sin entrega de kit',
          columns: [...personColumns, { header: 'Stand', width: 8, center: true }, { header: 'Teléfono', text: true, width: 14 }],
          rows: withoutKit.map((e) => [...personCells(e), e.stand, e.phone]),
          emptyText: 'Todos los emprendedores recibieron su kit.',
        },
      ];
    },
  },
  {
    id: 'bonos',
    group: 'finanzas',
    title: 'Bonos de emprendimiento',
    description: 'Cuentas registradas para hacer las transferencias después de la feria.',
    icon: Landmark,
    contents: ['Cuentas para transferir', 'Asistentes sin cuenta'],
    count: (state) => state.bonuses.length,
    sheets: (state) => {
      const people = indexEntrepreneurs(state.entrepreneurs);
      const withAccount = new Set(state.bonuses.map((b) => b.entrepreneurId));
      const attendees = new Set(state.attendance.map((a) => a.entrepreneurId));
      const pending = state.entrepreneurs.filter((e) => attendees.has(e.id) && !withAccount.has(e.id)).sort(bySectionThenName);
      return [
        {
          name: 'Cuentas para transferir',
          title: 'Cuentas registradas para el bono',
          highlights: [
            { label: 'Cuentas registradas', value: state.bonuses.length },
            { label: 'Asistentes sin cuenta', value: pending.length, tone: 'rojo' },
            { label: 'Autorizaron sus datos', value: state.bonuses.filter((b) => b.dataConsent).length, tone: 'neutral' },
          ],
          columns: [
            ...personColumns,
            { header: 'Días asistidos', width: 14, center: true },
            { header: 'Entidad', width: 18 },
            { header: 'Tipo de cuenta', width: 15 },
            { header: 'Número de cuenta', text: true, width: 20 },
            { header: 'Titular', width: 28 },
            { header: 'Documento del titular', text: true, width: 18 },
            { header: 'Autorización de datos', width: 14, badge: true },
            { header: 'Fecha de registro', width: 17 },
            { header: 'Registrado por', width: 22 },
          ],
          rows: [...state.bonuses]
            .sort((a, b) => a.at.localeCompare(b.at))
            .map((b) => {
              const e = people.get(b.entrepreneurId) ?? missing;
              return [
                ...personCells(e),
                b.verifiedDays.map((d) => `Día ${d}`).join(' y '),
                b.account.bank,
                ACCOUNT_TYPE_LABEL[b.account.type],
                b.account.number,
                b.account.holderName,
                b.account.holderDocument,
                yesNo(b.dataConsent),
                formatForExport(b.at),
                b.operator,
              ];
            }),
          emptyText: 'Todavía no se ha registrado ninguna cuenta.',
        },
        {
          name: 'Asistentes sin cuenta',
          title: 'Asistieron a la feria y no han registrado cuenta',
          columns: [...personColumns, { header: 'Teléfono', text: true, width: 14 }],
          rows: pending.map((e) => [...personCells(e), e.phone]),
          emptyText: 'Todos los asistentes registraron su cuenta.',
        },
      ];
    },
  },
  {
    id: 'ventas',
    group: 'finanzas',
    title: 'Ventas por sección',
    description: 'Balance por día y por corte, con una hoja por sección.',
    icon: ChartColumn,
    contents: ['Resumen', 'Una hoja por sección'],
    count: (state) => state.sales.length,
    sheets: buildSalesSheets,
  },
  {
    id: 'caja-menor',
    group: 'finanzas',
    title: 'Caja menor',
    description: 'Dinero asignado, cada gasto y su categoría, por día.',
    icon: Wallet,
    contents: ['Resumen por día', 'Gastos', 'Por categoría'],
    count: (state) => state.pettyCash.expenses.length,
    sheets: buildPettyCashSheets,
  },
  {
    id: 'visitantes',
    group: 'publico',
    title: 'Visitantes',
    description: 'Público que registró su visita escaneando el QR.',
    icon: UserRoundCheck,
    contents: ['Resumen', 'Visitantes', 'Lugares', 'Por día'],
    count: (state) => state.visitors.list.length,
    sheets: buildVisitorSheets,
  },
  {
    id: 'turismo',
    group: 'publico',
    title: 'Informe turístico de la feria',
    description: 'Cómo se comportó la feria según las estadísticas de turismo: turistas, excursionistas, noches, motivo del viaje, transporte y afluencia.',
    icon: Luggage,
    contents: ['Resumen turístico', 'Procedencia', 'Afluencia por hora', 'Metodología'],
    count: (state) => state.visitors.list.length,
    sheets: buildTourismSheets,
  },
];

export async function downloadReport(id: ReportId, state: FairState, generatedBy?: string): Promise<void> {
  const report = REPORTS.find((r) => r.id === id)!;
  await downloadWorkbook(`feria-astrea_${report.id}_${fileStamp()}.xlsx`, { title: report.title, generatedBy }, report.sheets(state));
}
