import { useMemo, useState } from 'react';
import { Star, Clock, Wand2 } from 'lucide-react';
import { services } from './data/forms';
import { extractCategories } from './utils/categories';
import { searchServices } from './utils/search';
import { useFavorites } from './hooks/useFavorites';
import { useRecent } from './hooks/useRecent';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { SearchBar } from './components/SearchBar';
import { CategoryFilter } from './components/CategoryFilter';
import { QuickActions } from './components/QuickActions';
import { ServiceGrid } from './components/ServiceGrid';
import { Wizard } from './components/Wizard';
import type { Service } from './data/forms';

export default function App() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  const { favoriteIds, toggleFavorite } = useFavorites();
  const { recentIds, addRecent } = useRecent();

  const categories = useMemo(() => extractCategories(services), []);

  const trimmedQuery = query.trim();

  const searchResults = useMemo(() => {
    if (!trimmedQuery) return null;
    return searchServices(trimmedQuery, services).map((r) => r.service);
  }, [trimmedQuery]);

  const visibleServices = useMemo(() => {
    let base: Service[] = searchResults ?? services;
    if (activeCategory) {
      base = base.filter((s) => s.category === activeCategory);
    }
    return base;
  }, [searchResults, activeCategory]);

  const favoriteServices = useMemo(
    () => favoriteIds.map((id) => services.find((s) => s.id === id)).filter((s): s is Service => Boolean(s)),
    [favoriteIds]
  );

  const recentServices = useMemo(
    () => recentIds.map((id) => services.find((s) => s.id === id)).filter((s): s is Service => Boolean(s)),
    [recentIds]
  );

  function handleOpen(service: Service) {
    addRecent(service.id);
  }

  const showBrowseExtras = !trimmedQuery;
  const noResults = trimmedQuery !== '' && visibleServices.length === 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8">
        <section className="flex flex-col items-center gap-4">
          <SearchBar value={query} onChange={setQuery} />
          <button
            type="button"
            onClick={() => setWizardOpen(true)}
            className="flex min-h-[44px] items-center gap-2 rounded-full border-2 border-secondary/30 bg-white px-5 py-2.5 text-sm font-bold text-secondary transition-colors hover:bg-secondary/10 focus-visible:outline-2"
          >
            <Wand2 className="h-4 w-4" aria-hidden="true" />
            לא בטוח איזה טופס צריך?
          </button>
        </section>

        {noResults && (
          <section className="flex flex-col items-center gap-4 rounded-xl border border-black/5 bg-white p-8 text-center">
            <p className="text-base font-semibold text-ink">לא מצאנו שירות מתאים</p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setActiveCategory(null);
                }}
                className="min-h-[44px] rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary/90 focus-visible:outline-2"
              >
                כל שירותי הארנונה
              </button>
              <button
                type="button"
                onClick={() => setWizardOpen(true)}
                className="min-h-[44px] rounded-full border-2 border-secondary/30 bg-white px-5 py-2.5 text-sm font-bold text-secondary hover:bg-secondary/10 focus-visible:outline-2"
              >
                ויש לי שאלה / צריך בירור
              </button>
            </div>
          </section>
        )}

        {showBrowseExtras && (
          <QuickActions services={services} onOpen={handleOpen} />
        )}

        {showBrowseExtras && favoriteServices.length > 0 && (
          <section aria-labelledby="favorites-heading">
            <h2
              id="favorites-heading"
              className="mb-3 flex items-center gap-2 text-lg font-bold text-ink"
            >
              <Star className="h-5 w-5 text-warning" aria-hidden="true" />
              המועדפים שלי
            </h2>
            <ServiceGrid
              services={favoriteServices}
              favoriteIds={favoriteIds}
              onToggleFavorite={toggleFavorite}
              onOpen={handleOpen}
            />
          </section>
        )}

        {showBrowseExtras && recentServices.length > 0 && (
          <section aria-labelledby="recent-heading">
            <h2
              id="recent-heading"
              className="mb-3 flex items-center gap-2 text-lg font-bold text-ink"
            >
              <Clock className="h-5 w-5 text-secondary" aria-hidden="true" />
              נפתחו לאחרונה
            </h2>
            <ServiceGrid
              services={recentServices}
              favoriteIds={favoriteIds}
              onToggleFavorite={toggleFavorite}
              onOpen={handleOpen}
            />
          </section>
        )}

        <section aria-labelledby="all-services-heading" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="all-services-heading" className="text-lg font-bold text-ink">
              {trimmedQuery ? 'תוצאות חיפוש' : 'כל השירותים'}
            </h2>
          </div>
          <CategoryFilter
            categories={categories}
            active={activeCategory}
            onSelect={setActiveCategory}
          />
          {!noResults && (
            <ServiceGrid
              services={visibleServices}
              favoriteIds={favoriteIds}
              onToggleFavorite={toggleFavorite}
              onOpen={handleOpen}
              highlight={trimmedQuery}
            />
          )}
        </section>
      </main>

      <Footer />

      {wizardOpen && (
        <Wizard
          allServices={services}
          onClose={() => setWizardOpen(false)}
          favoriteIds={favoriteIds}
          onToggleFavorite={toggleFavorite}
          onOpen={handleOpen}
        />
      )}
    </div>
  );
}
