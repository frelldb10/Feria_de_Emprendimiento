import type {
  ActivityEntry,
  AttendanceRecord,
  Entrepreneur,
  EventDay,
  FairState,
  KitDelivery,
  LogisticsCheck,
  SaleCut,
  SaleRecord,
  SectionId,
  TrainingAttendance,
  TrainingInfo,
} from './types';

// Datos de demostración: nombres y documentos ficticios.
type SeedRow = [
  document: string,
  ownerName: string,
  businessName: string,
  category: string,
  section: SectionId,
  phone: string,
  needsPower: boolean,
  chairs: number,
];

const ROWS: SeedRow[] = [
  ['1065812345', 'Yarledis Pacheco Oñate', 'Dulces La Abuela', 'Dulces típicos', 'gastronomia', '3004512210', false, 2],
  ['77184520', 'Luis Alberto Mendoza Arias', 'Quesos El Paraíso', 'Lácteos', 'gastronomia', '3012258841', true, 2],
  ['1065623987', 'Mileidys Quintero Ríos', 'Mochilas Tejidas Mileidys', 'Tejidos', 'manualidades', '3157781203', false, 2],
  ['12436781', 'Over Camargo Daza', 'Café Serranía', 'Café', 'gastronomia', '3216604415', true, 3],
  ['1003378451', 'Dayana Marcela Ospino', 'Bisutería Dayi', 'Accesorios', 'moda', '3045519870', false, 2],
  ['1065098734', 'Jhon Freddy Arias Peñaloza', 'Carpintería El Roble', 'Madera', 'manualidades', '3118823456', true, 2],
  ['49761203', 'Rosmira Villazón Castro', 'Bollos y Arepas Doña Rosa', 'Comidas', 'gastronomia', '3205571134', true, 3],
  ['1065445612', 'Eder Manuel Torres Fuentes', 'Miel Montecristo', 'Agroindustria', 'gastronomia', '3002217789', false, 2],
  ['1003512876', 'Kelly Johana Rangel', 'Moda Kelly', 'Confección', 'moda', '3137745521', true, 2],
  ['1065771290', 'Wilmer Andrés Peralta', 'Cacao Astrea', 'Agroindustria', 'gastronomia', '3014456632', false, 2],
  ['49798834', 'Ana Lucía Barros', 'Uñas y Belleza Ana', 'Belleza', 'moda', '3168890014', true, 2],
  ['12439902', 'Nelson Enrique Ochoa', 'Tallados Ochoa', 'Madera', 'manualidades', '3109987765', false, 2],
  ['1065334178', 'Luz Dary Cuello', 'Jabones Naturales Luz', 'Cosmética natural', 'moda', '3226671290', false, 2],
  ['77190344', 'Fabián Herrera Galván', 'Panadería San Martín', 'Panadería', 'gastronomia', '3005543218', true, 3],
  ['1065887123', 'Yuranis Pérez Mindiola', 'Suero y Queso Yuranis', 'Lácteos', 'gastronomia', '3147712096', true, 2],
  ['1065210987', 'Carlos Mario Daza', 'Hamacas del Cesar', 'Tejidos', 'manualidades', '3183320471', false, 2],
  ['1003467712', 'Sandra Milena Padilla', 'Tortas y Postres Sandra', 'Repostería', 'gastronomia', '3016678934', true, 2],
  ['1065556201', 'Iván Darío Montero', 'Empanadas La Granja', 'Comidas', 'gastronomia', '3124409876', true, 2],
  ['49812276', 'Marelvis Ortega', 'Ropa Infantil Marelvis', 'Confección', 'moda', '3193345567', true, 2],
  ['12447315', 'Jorge Eliécer Castilla', 'Encurtidos El Picante', 'Conservas', 'gastronomia', '3042281190', false, 2],
  ['1003590843', 'Leidy Tatiana Jiménez', 'Calzado Artesanal Leidy', 'Calzado', 'moda', '3175560923', false, 2],
  ['1065667345', 'Robinson Fuentes', 'Bebidas Tradicionales Robinson', 'Bebidas', 'gastronomia', '3208812345', true, 2],
  ['49830561', 'Edilma Suárez', 'Bordados Edilma', 'Bordados', 'manualidades', '3001198273', false, 2],
  ['1065908876', 'Duván Arley Quiroz', 'Barbería Estilo DQ', 'Barbería', 'moda', '3115567789', true, 2],
];

// Sufijos fijos para que los QR de la demostración no cambien al restablecer.
const QR_SUFFIXES = ['K7QM', 'R2XD', 'P9TA', 'W4HN', 'B6ZC', 'M3JV', 'T8LE', 'H5YQ', 'N2GS', 'C7DR', 'Z4KP', 'F9WB', 'J3RT', 'X6NA', 'D8HM', 'L2VE', 'Q5CS', 'S7ZG', 'V4TB', 'G9PK'];
/** Los últimos cuatro emprendedores quedan sin QR para probar la generación masiva. */
const WITH_QR = QR_SUFFIXES.length;

export const DEFAULT_TRAINING: TrainingInfo = {
  title: 'Capacitación de emprendedores',
  date: '',
  place: '',
};

function todayAt(hours: number, minutes: number): string {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

const pad = (n: number, size = 4) => String(n).padStart(size, '0');

export function createSeedState(): FairState {
  const createdAt = todayAt(7, 0);
  const entrepreneurs: Entrepreneur[] = ROWS.map(
    ([document, ownerName, businessName, category, section, phone, needsPower, chairs], i) => ({
      id: `emp_${pad(i + 1, 3)}`,
      document,
      ownerName,
      businessName,
      category,
      section,
      phone,
      needsPower,
      chairs,
      stand: `${i < 12 ? 'A' : 'B'}-${pad((i % 12) + 1, 2)}`,
      qrCode: i < WITH_QR ? `FE-${pad(i + 1)}-${QR_SUFFIXES[i]}` : null,
      createdAt,
    }),
  );
  const byId = (id: string) => entrepreneurs.find((e) => e.id === id)!.businessName;

  const arrivals: Array<[index: number, h: number, m: number, method: 'qr' | 'manual']> = [
    [0, 7, 42, 'qr'],
    [1, 7, 48, 'qr'],
    [3, 7, 55, 'qr'],
    [4, 8, 3, 'manual'],
    [6, 8, 10, 'qr'],
    [7, 8, 21, 'qr'],
    [9, 8, 34, 'qr'],
    [13, 8, 47, 'qr'],
    [14, 9, 5, 'qr'],
  ];
  // Algunos ya volvieron el Día 2, para que el balance tenga con qué comparar.
  const secondDayArrivals = [0, 1, 3, 6, 13, 15, 16];
  const attendance: AttendanceRecord[] = [
    ...arrivals.map(([index, h, m, method], i): AttendanceRecord => ({
      id: `asi_seed${i}`,
      entrepreneurId: entrepreneurs[index].id,
      day: 1,
      at: todayAt(h, m),
      operator: 'Puerta principal',
      method,
    })),
    ...secondDayArrivals.map((index, i): AttendanceRecord => ({
      id: `asi_seed2_${i}`,
      entrepreneurId: entrepreneurs[index].id,
      day: 2,
      at: todayAt(7, 50 + i),
      operator: 'Puerta principal',
      method: 'qr',
    })),
  ];

  const trainingAttendance: TrainingAttendance[] = [0, 1, 3, 6, 9].map((index, i) => ({
    id: `cap_seed${i}`,
    entrepreneurId: entrepreneurs[index].id,
    at: todayAt(9, 30 + i * 2),
    operator: 'Capacitación',
    method: 'qr',
  }));

  const kitPhoto = (index: number) => ({
    fileName: `kit_${entrepreneurs[index].qrCode}_demo.jpg`,
    originalName: 'IMG_demo.jpg',
    sizeKb: 1840,
  });
  const kits: KitDelivery[] = [
    { id: 'kit_seed0', entrepreneurId: entrepreneurs[0].id, items: { gorras: true, sueteres: true, pendon: true }, photo: kitPhoto(0), at: todayAt(8, 15), operator: 'Logística 1' },
    { id: 'kit_seed1', entrepreneurId: entrepreneurs[1].id, items: { gorras: true, sueteres: true, pendon: true }, photo: kitPhoto(1), at: todayAt(8, 22), operator: 'Logística 1' },
    { id: 'kit_seed2', entrepreneurId: entrepreneurs[3].id, items: { gorras: true, sueteres: true, pendon: true }, photo: kitPhoto(3), at: todayAt(8, 40), operator: 'Logística 1' },
    { id: 'kit_seed3', entrepreneurId: entrepreneurs[4].id, items: { gorras: true, sueteres: false, pendon: true }, photo: kitPhoto(4), at: todayAt(8, 52), operator: 'Logística 1' },
  ];

  const logistics: Record<string, LogisticsCheck> = {};
  for (const index of [0, 1, 3, 4, 6]) {
    logistics[entrepreneurs[index].id] = {
      standReady: true,
      powerConnected: entrepreneurs[index].needsPower,
      chairsDelivered: index !== 6,
      updatedAt: todayAt(8, 30),
      operator: 'Logística 1',
    };
  }

  // Día 1 con sus dos cortes; Día 2 solo con el primer corte.
  const salesPlan: Array<[day: EventDay, cut: SaleCut, rows: Array<[index: number, amount: number]>]> = [
    [1, 1, [[0, 85_000], [1, 142_000], [3, 96_000], [4, 60_000], [6, 175_000], [7, 48_000], [9, 72_000], [13, 210_000], [14, 118_000]]],
    [1, 2, [[0, 120_000], [1, 98_000], [3, 134_000], [6, 240_000], [13, 186_000]]],
    [2, 1, [[0, 140_000], [1, 115_000], [3, 88_000], [6, 260_000], [13, 195_000], [15, 92_000], [16, 74_000]]],
  ];
  const sales: SaleRecord[] = salesPlan.flatMap(([day, cut, rows]) =>
    rows.map(([index, amount], i): SaleRecord => ({
      id: `ven_seed_${day}_${cut}_${i}`,
      entrepreneurId: entrepreneurs[index].id,
      day,
      cut,
      amount,
      at: todayAt(cut === 1 ? 12 : 17, i),
      operator: 'Finanzas',
    })),
  );

  const activity: ActivityEntry[] = [
    ...attendance.map((a, i): ActivityEntry => ({
      id: `act_seed_a${i}`, at: a.at, kind: 'attendance', message: `${byId(a.entrepreneurId)} ingresó el Día ${a.day}`,
    })),
    ...trainingAttendance.map((t, i): ActivityEntry => ({
      id: `act_seed_c${i}`, at: t.at, kind: 'training', message: `${entrepreneurs.find((e) => e.id === t.entrepreneurId)!.businessName} asistió a la capacitación`,
    })),
    ...kits.map((k, i): ActivityEntry => ({
      id: `act_seed_k${i}`, at: k.at, kind: 'kit', message: `Kit entregado a ${entrepreneurs.find((e) => e.id === k.entrepreneurId)!.businessName}`,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return {
    version: 3,
    entrepreneurs,
    attendance,
    training: { info: { ...DEFAULT_TRAINING }, attendance: trainingAttendance },
    logistics,
    kits,
    bonuses: [],
    sales,
    activity,
  };
}

export function createEmptyState(): FairState {
  return {
    version: 3,
    entrepreneurs: [],
    attendance: [],
    training: { info: { ...DEFAULT_TRAINING }, attendance: [] },
    logistics: {},
    kits: [],
    bonuses: [],
    sales: [],
    activity: [],
  };
}
