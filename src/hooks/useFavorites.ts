import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

const FAVORITES_KEY = 'arnona-hub:favorites';

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useLocalStorage<string[]>(FAVORITES_KEY, []);

  const isFavorite = useCallback(
    (id: string) => favoriteIds.includes(id),
    [favoriteIds]
  );

  const toggleFavorite = useCallback(
    (id: string) => {
      setFavoriteIds((prev) =>
        prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
      );
    },
    [setFavoriteIds]
  );

  return { favoriteIds, isFavorite, toggleFavorite };
}
