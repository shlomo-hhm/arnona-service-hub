import { ExternalLink, Star } from 'lucide-react';
import type { Service } from '../data/forms';
import { TypeBadge, LoginRequiredBadge } from './TypeBadge';
import { InfoTooltip } from './InfoTooltip';

interface ServiceCardProps {
  service: Service;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onOpen: (service: Service) => void;
  highlight?: string;
}

function highlightText(text: string, query?: string) {
  if (!query || query.trim().length < 2) return text;
  const idx = text.toLowerCase().indexOf(query.trim().toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-warning/30 px-0.5 text-ink">
        {text.slice(idx, idx + query.trim().length)}
      </mark>
      {text.slice(idx + query.trim().length)}
    </>
  );
}

export function ServiceCard({
  service,
  isFavorite,
  onToggleFavorite,
  onOpen,
  highlight,
}: ServiceCardProps) {
  const openLabel = service.type === 'online-form' ? 'פתיחת הטופס' : 'פתיחת השירות';
  const isUnverified = service.verified !== true;

  function handleOpenClick() {
    if (isUnverified) {
      const confirmed = window.confirm(
        'קישור זה עדיין לא אומת במלואו. להמשיך לפתיחה בכל זאת?'
      );
      if (!confirmed) return;
    }
    onOpen(service);
    window.open(service.url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-black/5 bg-cardbg p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="text-base font-bold leading-snug text-ink">
          {highlightText(service.title, highlight)}
        </h3>
        <button
          type="button"
          aria-label={isFavorite ? 'הסר ממועדפים' : 'הוסף למועדפים'}
          aria-pressed={isFavorite}
          onClick={() => onToggleFavorite(service.id)}
          className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full hover:bg-warning/10 focus-visible:outline-2"
        >
          <Star
            className={`h-5 w-5 ${isFavorite ? 'fill-warning text-warning' : 'text-black/30'}`}
            aria-hidden="true"
          />
        </button>
      </div>

      <p className="mb-2 text-sm leading-relaxed text-ink/80">
        {highlightText(service.description, highlight)}
      </p>

      {service.whenToUse && (
        <p className="mb-3 text-xs leading-relaxed text-ink/60">
          <span className="font-semibold">מתי משתמשים: </span>
          {highlightText(service.whenToUse, highlight)}
        </p>
      )}

      <div className="mb-3 mt-auto flex flex-wrap items-center gap-2">
        <TypeBadge type={service.type} />
        {service.loginRequired && <LoginRequiredBadge />}
        {service.notes && <InfoTooltip text={service.notes} />}
      </div>

      <button
        type="button"
        onClick={handleOpenClick}
        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2"
      >
        {openLabel}
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
