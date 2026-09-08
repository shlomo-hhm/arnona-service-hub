import type { ServiceType } from '../data/forms';
import { ShieldCheck } from 'lucide-react';

const TYPE_LABELS: Record<ServiceType, string> = {
  'online-form': 'טופס מקוון',
  'info-page': 'מידע',
  pdf: 'PDF',
  'personal-area': 'אזור אישי',
  'external-official': 'שירות חיצוני',
};

const TYPE_STYLES: Record<ServiceType, string> = {
  'online-form': 'bg-primary/10 text-primary',
  'info-page': 'bg-secondary/10 text-secondary',
  pdf: 'bg-warning/10 text-warning',
  'personal-area': 'bg-success/10 text-success',
  'external-official': 'bg-ink/10 text-ink',
};

export function TypeBadge({ type }: { type: ServiceType }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${TYPE_STYLES[type]}`}
    >
      {TYPE_LABELS[type]}
    </span>
  );
}

export function LoginRequiredBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-warning/10 px-2 py-1 text-xs font-semibold text-warning">
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
      נדרשת הזדהות
    </span>
  );
}
