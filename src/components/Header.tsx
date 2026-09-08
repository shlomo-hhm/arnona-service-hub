import { Landmark } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b border-black/5 bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Landmark className="h-6 w-6 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-ink sm:text-2xl">
            מרכז שירותי ארנונה
          </h1>
          <p className="text-sm text-ink/60">
            עיריית ירושלים • כלי עבודה מהיר לטפסים ושירותים
          </p>
        </div>
      </div>
    </header>
  );
}
