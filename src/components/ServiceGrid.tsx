import type { Service } from '../data/forms';
import { ServiceCard } from './ServiceCard';

interface ServiceGridProps {
  services: Service[];
  favoriteIds: string[];
  onToggleFavorite: (id: string) => void;
  onOpen: (service: Service) => void;
  highlight?: string;
}

export function ServiceGrid({
  services,
  favoriteIds,
  onToggleFavorite,
  onOpen,
  highlight,
}: ServiceGridProps) {
  if (services.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {services.map((service) => (
        <ServiceCard
          key={service.id}
          service={service}
          isFavorite={favoriteIds.includes(service.id)}
          onToggleFavorite={onToggleFavorite}
          onOpen={onOpen}
          highlight={highlight}
        />
      ))}
    </div>
  );
}
