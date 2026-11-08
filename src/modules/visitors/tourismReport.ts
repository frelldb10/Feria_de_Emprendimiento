import { formatDateOnly } from '../../lib/format';
import type { CellValue, SheetSpec } from '../../lib/xlsx';
import type { FairState, Visitor } from '../../store/types';
import { hourInColombia, originLabel, tourismStats, VISITOR_ORIGINS, type Tally } from '../../store/visitors';
import { buildBalance } from '../finance/balance';

const MARKET: Record<Visitor['origin'], string> = {
  astrea_urbano: 'Local',
  astrea_rural: 'Local',
  cesar: 'Regional',
  otro_departamento: 'Nacional',
};

const pct = (part: number, base: number): CellValue => ({ value: base > 0 ? part / base : 0, percent: true });
const sumOf = (rows: Tally[]) => rows.reduce((n, r) => n + r.count, 0);
const shortDate = new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });

/** "2026-11-14" → "sáb, 14 nov" */
function dayLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return shortDate.format(new Date(y, m - 1, d)).replace(/\./g, '');
}

const hourRange = (h: number) => `${String(h).padStart(2, '0')}:00 a ${String(h).padStart(2, '0')}:59`;

/**
 * Informe turístico de la feria: clasifica al público con los conceptos de las Recomendaciones
 * Internacionales para Estadísticas de Turismo (RIET 2008) y resume la encuesta del registro.
 */
export function buildTourismSheets(state: FairState): SheetSpec[] {
  const list = state.visitors.list;
  const t = tourismStats(list);
  const sales = buildBalance(state, 'all').overall;
  const dates = [...new Set(list.map((v) => v.visitDate))].sort();
  const withoutSurvey = list.length - t.answeredSurvey;

  // Afluencia: registros por día y por hora.
  const byDate = dates.map((date) => ({ date, count: list.filter((v) => v.visitDate === date).length }));
  const hours = list.map((v) => hourInColombia(v.at));
  const byHour = new Map<number, number>();
  for (const h of hours) byHour.set(h, (byHour.get(h) ?? 0) + 1);
  const busiestDay = [...byDate].sort((a, b) => b.count - a.count)[0];
  const busiestHour = [...byHour.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];

  const rows: CellValue[][] = [];
  const groupRows: number[] = [];
  const group = (title: string) => {
    groupRows.push(rows.length);
    rows.push([title, '', '']);
  };
  const tallyRows = (items: Tally[], prefix = '') => {
    const base = sumOf(items);
    for (const item of items) rows.push([`${prefix}${item.label}`, item.count, pct(item.count, base)]);
  };

  group('1. Clasificación del público (porcentaje sobre el total de registros)');
  rows.push(['Registros totales', t.total, pct(t.total, t.total)]);
  rows.push(['Público local: vive en Astrea', t.locals, pct(t.locals, t.total)]);
  rows.push(['Visitantes: vienen de otro municipio', t.visitors, pct(t.visitors, t.total)]);

  group('2. Visitantes según pernoctación (porcentaje sobre los visitantes de otros municipios)');
  rows.push(['Turistas: pasan al menos una noche en Astrea', t.tourists, pct(t.tourists, t.visitors)]);
  rows.push(['Excursionistas: llegan y regresan el mismo día', t.excursionists, pct(t.excursionists, t.visitors)]);
  if (t.visitorsWithoutNights > 0) rows.push(['Sin dato (registrados antes de la encuesta)', t.visitorsWithoutNights, pct(t.visitorsWithoutNights, t.visitors)]);

  group('3. Procedencia por mercado (porcentaje sobre el total de registros)');
  for (const o of VISITOR_ORIGINS) {
    const count = list.filter((v) => v.origin === o.id).length;
    rows.push([`Mercado ${MARKET[o.id].toLowerCase()}: ${o.label}`, count, pct(count, t.total)]);
  }

  group('4. Pernoctación y hospedaje de los turistas');
  rows.push(['Pernoctaciones (noches que suman los turistas)', t.nights, '']);
  rows.push(['Estancia media (noches por turista)', { value: t.averageStay, decimal: true }, '']);
  tallyRows(t.byLodging, 'Hospedaje: ');

  group('5. Motivo principal del viaje (visitantes de otros municipios)');
  tallyRows(t.byPurpose);

  group('6. Medio de transporte (visitantes de otros municipios)');
  tallyRows(t.byTransport);

  group('7. Grupo de viaje (todos los registros con respuesta)');
  rows.push(['Tamaño promedio del grupo (personas)', { value: t.averageGroup, decimal: true }, '']);
  tallyRows(t.byGroup);

  group('8. Cómo se enteraron de la feria');
  tallyRows(t.byHeard);

  group('9. Afluencia');
  rows.push([`Día con más registros: ${busiestDay ? formatDateOnly(busiestDay.date) : 'sin registros'}`, busiestDay?.count ?? 0, pct(busiestDay?.count ?? 0, t.total)]);
  rows.push([`Hora con más registros: ${busiestHour ? hourRange(busiestHour[0]) : 'sin registros'}`, busiestHour?.[1] ?? 0, pct(busiestHour?.[1] ?? 0, t.total)]);

  group('10. Movimiento económico de la feria');
  rows.push(['Ventas reportadas por los emprendedores', { value: sales.total, money: true }, '']);
  rows.push(['Emprendedores que reportaron ventas', sales.reporters, '']);
  rows.push(['Ventas por visitante registrado (referencia)', { value: t.total > 0 ? Math.round(sales.total / t.total) : 0, money: true }, '']);

  const notes = [
    'Clasificación según las Recomendaciones Internacionales para Estadísticas de Turismo (RIET 2008) de Naciones Unidas y la OMT.',
    `Fuente: registro de visitantes por QR, ${t.total} registros en ${dates.length === 1 ? '1 día' : `${dates.length} días`}. Cada persona cuenta una vez por día.`,
  ];
  if (withoutSurvey > 0) notes.push(`${withoutSurvey} registros se hicieron antes de la encuesta turística y no tienen esas respuestas.`);

  const summary: SheetSpec = {
    name: 'Resumen turístico',
    title: 'Comportamiento turístico de la feria',
    notes,
    highlights: [
      { label: 'Visitantes registrados', value: t.total, tone: 'neutral' },
      { label: 'Turistas', value: t.tourists },
      { label: 'Excursionistas', value: t.excursionists, tone: 'amarillo' },
      { label: 'Estancia media (noches)', value: t.averageStay, decimal: true, tone: 'neutral' },
    ],
    columns: [
      { header: 'Indicador', width: 56 },
      { header: 'Cantidad', width: 14 },
      { header: 'Porcentaje', percent: true, width: 13 },
    ],
    rows,
    groupRows,
  };

  // Lugares con su mercado.
  const places = new Map<string, { place: string; origin: Visitor['origin']; count: number }>();
  for (const v of list) {
    if (!v.originDetail) continue;
    const key = `${v.origin}|${v.originDetail.toLowerCase()}`;
    const entry = places.get(key) ?? { place: v.originDetail, origin: v.origin, count: 0 };
    if (entry.place === entry.place.toLowerCase() && v.originDetail !== v.originDetail.toLowerCase()) entry.place = v.originDetail;
    entry.count += 1;
    places.set(key, entry);
  }
  const withoutPlace = list.filter((v) => !v.originDetail).length;
  const placeRows = [...places.values()].sort((a, b) => b.count - a.count || a.place.localeCompare(b.place));
  const origin: SheetSpec = {
    name: 'Procedencia',
    title: 'Lugares de donde vino el público',
    notes: [
      'Mercado local: Astrea. Regional: otros municipios del Cesar. Nacional: otros departamentos.',
      ...(withoutPlace > 0 ? [`${withoutPlace} registros del casco urbano no indicaron barrio.`] : []),
    ],
    columns: [
      { header: 'Lugar', width: 30 },
      { header: 'Procedencia', width: 26 },
      { header: 'Mercado', width: 12, center: true },
      { header: 'Visitantes', width: 12, center: true },
      { header: 'Porcentaje', percent: true, width: 12 },
    ],
    rows: placeRows.map((p) => [p.place, originLabel(p.origin), MARKET[p.origin], p.count, pct(p.count, t.total)]),
    emptyText: 'Todavía no hay lugares registrados.',
  };

  // Registros por hora, una columna por día.
  const hourKeys = [...byHour.keys()].sort((a, b) => a - b);
  const flow: SheetSpec = {
    name: 'Afluencia por hora',
    title: 'Registros por día y franja horaria',
    notes: ['Hora en que cada persona se registró al llegar (hora de Colombia).'],
    columns: [
      { header: 'Franja horaria', width: 18 },
      ...dates.map((date) => ({ header: dayLabel(date), width: 13, center: true })),
      { header: 'Total', width: 11, center: true },
      { header: 'Porcentaje', percent: true, width: 12 },
    ],
    rows: hourKeys.map((h) => {
      const counts = dates.map((date) => list.filter((v) => v.visitDate === date && hourInColombia(v.at) === h).length);
      const total = byHour.get(h) ?? 0;
      return [hourRange(h), ...counts, total, pct(total, t.total)];
    }),
    totals: ['Total', ...byDate.map((d) => d.count), t.total, pct(t.total, t.total)],
    emptyText: 'Todavía no hay visitantes registrados.',
  };

  const glossary: SheetSpec = {
    name: 'Metodología',
    title: 'Conceptos y forma de medir',
    notes: ['Definiciones tomadas de las Recomendaciones Internacionales para Estadísticas de Turismo (RIET 2008), adaptadas a la feria.'],
    columns: [
      { header: 'Concepto', width: 24 },
      { header: 'Definición', width: 86, wrap: true },
    ],
    rows: [
      ['Visitante', 'Persona que viaja a un lugar distinto de su entorno habitual, por menos de un año y por cualquier motivo principal que no sea trabajar para una entidad del lugar visitado.'],
      ['Turista', 'Visitante que pasa al menos una noche en el lugar visitado (visitante que pernocta).'],
      ['Excursionista', 'Visitante que llega y regresa el mismo día, sin pasar la noche (visitante del día).'],
      ['Entorno habitual', 'Zona donde una persona hace su vida cotidiana. En este informe es el municipio donde vive.'],
      ['Público local', 'Personas que viven en Astrea, en el casco urbano o en la zona rural. Están en su entorno habitual: son público de la feria, pero no visitantes en sentido turístico.'],
      ['Mercado', 'Local: Astrea. Regional: otros municipios del Cesar. Nacional: otros departamentos.'],
      ['Pernoctación', 'Cada noche que un turista pasa en Astrea. La opción "3 noches o más" se cuenta como 3, así que el total es un mínimo.'],
      ['Estancia media', 'Pernoctaciones divididas entre el número de turistas.'],
      ['Motivo principal del viaje', 'La razón sin la cual el viaje no se habría hecho.'],
      ['Grupo de viaje', 'Personas que llegan juntas, contando a quien se registra. Si varias personas del mismo grupo se registran, el grupo aparece más de una vez.'],
      ['Ventas por visitante', 'Ventas reportadas por los emprendedores divididas entre los visitantes registrados. Es una referencia: no todo el público se registra.'],
      ['Fuente de los datos', 'Registro voluntario con el QR de la entrada. Cada persona se registra una vez por día con su cédula. No es una muestra estadística: las cifras describen a quienes se registraron.'],
    ],
  };

  return [summary, origin, flow, glossary];
}
