import { useState, useRef, useEffect } from 'react';
import { CircleHelp } from 'lucide-react';

export function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  if (!text) return null;

  return (
    <span className="relative inline-block" ref={ref}>
      <button
        type="button"
        aria-label="מידע נוסף"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="flex h-[28px] w-[28px] items-center justify-center rounded-full text-secondary hover:bg-secondary/10 focus-visible:outline-2"
      >
        <CircleHelp className="h-5 w-5" aria-hidden="true" />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute z-20 top-full mt-2 w-64 rounded-md border border-secondary/20 bg-white p-3 text-xs leading-relaxed text-ink shadow-lg start-0"
        >
          {text}
        </span>
      )}
    </span>
  );
}
