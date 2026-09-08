import type { Service } from '../data/forms';
import { iconForService } from '../utils/icons';

interface QuickActionsProps {
  services: Service[];
  onOpen: (service: Service) => void;
}

// Priority order per spec: promote these ids to the front when present,
// then fill remaining slots with other popular:true services.
const PRIORITY_IDS = [
  'holders-exchange',
  'income-discount',
  'arnona-payment',
  'smart-discounts',
  'find-asset-number',
  'tabo-no-debt',
  'arnona-objection',
  'residential-arnona-inquiry',
];

const MAX_QUICK_ACTIONS = 8;

export function orderQuickActions(services: Service[]): Service[] {
  const popular = services.filter((s) => s.popular);
  const byId = new Map(popular.map((s) => [s.id, s]));
  const ordered: Service[] = [];

  for (const id of PRIORITY_IDS) {
    const service = byId.get(id);
    if (service) {
      ordered.push(service);
      byId.delete(id);
    }
  }
  for (const service of byId.values()) {
    ordered.push(service);
  }

  return ordered.slice(0, MAX_QUICK_ACTIONS);
}

export function QuickActions({ services, onOpen }: QuickActionsProps) {
  const actions = orderQuickActions(services);
  if (actions.length === 0) return null;

  return (
    <section aria-labelledby="quick-actions-heading">
      <h2 id="quick-actions-heading" className="mb-3 text-lg font-bold text-ink">
        הכי שימושיים
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {actions.map((service) => {
          const Icon = iconForService(service);
          return (
            <button
              key={service.id}
              type="button"
              onClick={() => {
                onOpen(service);
                window.open(service.url, '_blank', 'noopener,noreferrer');
              }}
              className="flex min-h-[44px] flex-col items-center gap-2 rounded-xl border border-black/5 bg-white p-4 text-center shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2"
            >
              <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
              <span className="text-sm font-semibold leading-snug text-ink">
                {service.title}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
