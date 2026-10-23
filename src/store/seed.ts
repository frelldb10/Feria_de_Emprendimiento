import type { FairState, NewEntrepreneur, SectionId, TrainingInfo } from './types';

// Emprendedores de prueba: nombres y documentos ficticios. El administrador los puede cargar
// desde el panel para ensayar antes de subir el Excel real.
type DemoRow = [
  document: string,
  ownerName: string,
  businessName: string,
  category: string,
  section: SectionId,
  phone: string,
  needsPower: boolean,
  chairs: number,
];

const ROWS: DemoRow[] = [
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

export const DEMO_ENTREPRENEURS: NewEntrepreneur[] = ROWS.map(
  ([document, ownerName, businessName, category, section, phone, needsPower, chairs], i) => ({
    document,
    ownerName,
    businessName,
    category,
    section,
    phone,
    needsPower,
    chairs,
    stand: `${i < 12 ? 'A' : 'B'}-${String((i % 12) + 1).padStart(2, '0')}`,
  }),
);

export const DEFAULT_TRAINING: TrainingInfo = {
  title: 'Capacitación de emprendedores',
  date: '',
  place: '',
};

export function createEmptyState(): FairState {
  return {
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
