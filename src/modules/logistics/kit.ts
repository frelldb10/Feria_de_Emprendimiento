import type { KitItemId } from '../../store/types';

export const KIT_ITEMS: { id: KitItemId; label: string; deliveredLabel: string }[] = [
  { id: 'gorras', label: 'Gorras', deliveredLabel: 'Recibieron gorras' },
  { id: 'sueteres', label: 'Suéteres', deliveredLabel: 'Recibieron suéteres' },
  { id: 'pendon', label: 'Pendón', deliveredLabel: 'Recibieron pendón' },
];

export const EMPTY_KIT: Record<KitItemId, boolean> = { gorras: false, sueteres: false, pendon: false };
