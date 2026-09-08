interface CategoryFilterProps {
  categories: string[];
  active: string | null;
  onSelect: (category: string | null) => void;
}

const ALL_LABEL = 'הכול';

export function CategoryFilter({ categories, active, onSelect }: CategoryFilterProps) {
  return (
    <div
      className="flex flex-wrap justify-center gap-2"
      role="group"
      aria-label="סינון לפי קטגוריה"
    >
      <button
        type="button"
        onClick={() => onSelect(null)}
        aria-pressed={active === null}
        className={`min-h-[44px] rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 ${
          active === null
            ? 'bg-primary text-white'
            : 'bg-white text-ink/70 hover:bg-primary/10'
        }`}
      >
        {ALL_LABEL}
      </button>
      {categories.map((category) => (
        <button
          key={category}
          type="button"
          onClick={() => onSelect(category)}
          aria-pressed={active === category}
          className={`min-h-[44px] rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 ${
            active === category
              ? 'bg-primary text-white'
              : 'bg-white text-ink/70 hover:bg-primary/10'
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  );
}
