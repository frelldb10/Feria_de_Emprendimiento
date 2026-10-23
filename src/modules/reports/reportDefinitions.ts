import { ChartColumn, GraduationCap, Landmark, PackageCheck, Users, type LucideIcon } from 'lucide-react';
import { fileStamp, formatDateOnly, formatForExport } from '../../lib/format';
import { downloadWorkbook, type SheetSpec } from '../../lib/xlsx';
import { sectionLabel } from '../../store/sections';
import { indexEntrepreneurs, isKitComplete } from '../../store/selectors';
import type { Entrepreneur, FairState } from '../../store/types';
import { ACCOUNT_TYPE_LABEL } from '../bonuses/bankAccount';
import { buildSalesSheets } from '../finance/balance';

export type ReportId = 'asistencia' | 'capacitacion' | 'kits' | 'bonos' | 'ventas';

export interface ReportDefinition {
  id: ReportId;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Qué trae como evidencia, en una frase corta. */
  evidence: string;
  count: (state: FairState) => number;
  sheets: (state: FairState) => SheetSpec[];
}

const yesNo = (value: boolean) => (value ? 'Sí' : 'No');
const missing = { document: '', ownerName: 'Emprendedor eliminado', businessName: '', stand: '', section: null } as unknown as Entrepreneur;
const method = (m: 'qr' | 'manual') => (m === 'qr' ? 'QR' : 'Manual');

const personColumns = [
  { header: 'Documento', text: true, width: 14 },
  { header: 'Emprendedor', width: 28 },
  { header: 'Emprendimiento', width: 30 },
  { header: 'Sección', width: 22 },
];
const personCells = (e: Entrepreneur) => [e.document, e.ownerName, e.businessName, sectionLabel(e.section)];

export const REPORTS: ReportDefinition[] = [
  {
    id: 'asistencia',
    title: 'Asistencia a la feria',
    description: 'Cada ingreso registrado en puerta, por día.',
    icon: Users,
    evidence: 'Registro por QR o manual, con hora y operador',
    count: (state) => state.attendance.length,
    sheets: (state) => {
      const people = indexEntrepreneurs(state.entrepreneurs);
      const rows = [...state.attendance]
        .sort((a, b) => a.day - b.day || a.at.localeCompare(b.at))
        .map((a) => {
          const e = people.get(a.entrepreneurId) ?? missing;
          return [`Día ${a.day}`, formatForExport(a.at), ...personCells(e), e.stand, method(a.method), a.operator];
        });
      return [
        {
          name: 'Asistencia',
          columns: [
            { header: 'Día', width: 8 },
            { header: 'Fecha y hora', width: 18 },
            ...personColumns,
            { header: 'Stand', width: 8 },
            { header: 'Registro', width: 10 },
            { header: 'Registrado por', width: 20 },
          ],
          rows,
        },
      ];
    },
  },
  {
    id: 'capacitacion',
    title: 'Asistencia a capacitación',
    description: 'Evidencia de quiénes asistieron y quiénes faltaron.',
    icon: GraduationCap,
    evidence: 'Hoja de asistentes y hoja de quienes no asistieron',
    count: (state) => state.training.attendance.length,
    sheets: (state) => {
      const { info, attendance } = state.training;
      const people = indexEntrepreneurs(state.entrepreneurs);
      const attended = new Set(attendance.map((a) => a.entrepreneurId));
      const preface = [
        info.title,
        `Fecha: ${info.date ? formatDateOnly(info.date) : 'sin definir'}`,
        `Lugar: ${info.place || 'sin definir'}`,
        `Asistieron ${attendance.length} de ${state.entrepreneurs.length} emprendedores`,
      ];
      return [
        {
          name: 'Asistieron',
          preface,
          columns: [
            { header: 'Fecha y hora', width: 18 },
            ...personColumns,
            { header: 'Registro', width: 10 },
            { header: 'Registrado por', width: 20 },
          ],
          rows: [...attendance]
            .sort((a, b) => a.at.localeCompare(b.at))
            .map((a) => {
              const e = people.get(a.entrepreneurId) ?? missing;
              return [formatForExport(a.at), ...personCells(e), method(a.method), a.operator];
            }),
        },
        {
          name: 'No asistieron',
          preface: [info.title],
          columns: [...personColumns, { header: 'Teléfono', text: true, width: 14 }],
          rows: state.entrepreneurs.filter((e) => !attended.has(e.id)).map((e) => [...personCells(e), e.phone]),
        },
      ];
    },
  },
  {
    id: 'kits',
    title: 'Kits',
    description: 'Entregas de gorras, suéteres y pendón por emprendedor.',
    icon: PackageCheck,
    evidence: 'Excel con el nombre de la foto de evidencia, e informe detallado en Word con firmas',
    count: (state) => state.kits.length,
    sheets: (state) => {
      const people = indexEntrepreneurs(state.entrepreneurs);
      return [
        {
          name: 'Kits',
          columns: [
            { header: 'Fecha y hora', width: 18 },
            ...personColumns,
            { header: 'Gorras', width: 9 },
            { header: 'Suéteres', width: 9 },
            { header: 'Pendón', width: 9 },
            { header: 'Estado', width: 11 },
            { header: 'Foto de evidencia', width: 44 },
            { header: 'Registrado por', width: 20 },
          ],
          rows: [...state.kits]
            .sort((a, b) => a.at.localeCompare(b.at))
            .map((k) => {
              const e = people.get(k.entrepreneurId) ?? missing;
              return [
                formatForExport(k.at),
                ...personCells(e),
                yesNo(k.items.gorras),
                yesNo(k.items.sueteres),
                yesNo(k.items.pendon),
                isKitComplete(k) ? 'Completo' : 'Parcial',
                k.photo.fileName,
                k.operator,
              ];
            }),
        },
      ];
    },
  },
  {
    id: 'bonos',
    title: 'Bonos de emprendimiento',
    description: 'Cuentas registradas para hacer las transferencias después de la feria.',
    icon: Landmark,
    evidence: 'Hoja para transferir y hoja de asistentes sin cuenta',
    count: (state) => state.bonuses.length,
    sheets: (state) => {
      const people = indexEntrepreneurs(state.entrepreneurs);
      const withAccount = new Set(state.bonuses.map((b) => b.entrepreneurId));
      const attendees = new Set(state.attendance.map((a) => a.entrepreneurId));
      return [
        {
          name: 'Cuentas para transferir',
          columns: [
            ...personColumns,
            { header: 'Días asistidos', width: 14 },
            { header: 'Entidad', width: 18 },
            { header: 'Tipo de cuenta', width: 16 },
            { header: 'Número de cuenta', text: true, width: 20 },
            { header: 'Titular', width: 28 },
            { header: 'Documento del titular', text: true, width: 20 },
            { header: 'Autorización de datos', width: 20 },
            { header: 'Fecha de registro', width: 18 },
            { header: 'Registrado por', width: 20 },
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
        },
        {
          name: 'Asistentes sin cuenta',
          columns: [...personColumns, { header: 'Teléfono', text: true, width: 14 }],
          rows: state.entrepreneurs
            .filter((e) => attendees.has(e.id) && !withAccount.has(e.id))
            .map((e) => [...personCells(e), e.phone]),
        },
      ];
    },
  },
  {
    id: 'ventas',
    title: 'Ventas por sección',
    description: 'Balance por día y por corte, con una hoja por sección.',
    icon: ChartColumn,
    evidence: 'Resumen, Gastronomía, Manualidades y Moda, Belleza y Estilo',
    count: (state) => state.sales.length,
    sheets: buildSalesSheets,
  },
];

export async function downloadReport(id: ReportId, state: FairState): Promise<void> {
  const report = REPORTS.find((r) => r.id === id)!;
  await downloadWorkbook(`feria-astrea_${report.id}_${fileStamp()}.xlsx`, report.sheets(state));
}
