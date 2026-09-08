import type { Service } from '../data/forms';

/**
 * Extracts the distinct list of categories present in the data, in the
 * order they first appear. Never hardcode categories in components —
 * always derive them from the data so new domains/services slot in
 * automatically.
 */
export function extractCategories(services: Service[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const service of services) {
    if (!seen.has(service.category)) {
      seen.add(service.category);
      ordered.push(service.category);
    }
  }
  return ordered;
}
