import {
  Home,
  CreditCard,
  BadgePercent,
  FileText,
  Building,
  CircleHelp,
  Landmark,
  type LucideIcon,
} from 'lucide-react';
import type { Service } from '../data/forms';

/**
 * Generic icon resolver driven by category/type, not by service id —
 * so new services automatically get a sensible icon with zero component
 * changes.
 */
export function iconForService(service: Service): LucideIcon {
  const cat = service.category;
  if (cat === 'שינויי מחזיקים ונכסים') return Home;
  if (cat === 'תשלום' || cat === 'תשלום וחשבון') return CreditCard;
  if (cat === 'הנחות בארנונה') return BadgePercent;
  if (cat === 'אישורים') return FileText;
  if (cat === 'נכסים מיוחדים') return Building;
  if (cat === 'עסקים וחיובים') return Building;
  if (cat === 'חיובים ובירורים' || cat === 'בירורים') return CircleHelp;
  if (cat === 'כללי') return Landmark;
  return FileText;
}
