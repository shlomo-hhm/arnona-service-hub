import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative mx-auto w-full max-w-3xl">
      <Search
        className="pointer-events-none absolute top-1/2 start-4 h-6 w-6 -translate-y-1/2 text-primary/60"
        aria-hidden="true"
      />
      <input
        type="search"
        inputMode="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="חפש מה התושב צריך... למשל: עברתי דירה, הנחה, טאבו, חוב, נכות"
        aria-label="חיפוש שירות ארנונה"
        className="min-h-[60px] w-full rounded-2xl border-2 border-primary/15 bg-white ps-12 pe-12 py-4 text-lg text-ink shadow-sm outline-none transition-colors placeholder:text-ink/40 focus:border-primary"
      />
      {value && (
        <button
          type="button"
          aria-label="נקה חיפוש"
          onClick={() => onChange('')}
          className="absolute top-1/2 end-3 flex h-[40px] w-[40px] -translate-y-1/2 items-center justify-center rounded-full hover:bg-black/5 focus-visible:outline-2"
        >
          <X className="h-5 w-5 text-ink/50" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
