import { Bus, CircleAlert, Hammer, Printer, SprayCan, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import type { PettyCashCategory } from '../../store/types';

export const CATEGORY_ICON: Record<PettyCashCategory, LucideIcon> = {
  transporte: Bus,
  alimentacion: UtensilsCrossed,
  papeleria: Printer,
  ferreteria: Hammer,
  aseo: SprayCan,
  imprevistos: CircleAlert,
};
