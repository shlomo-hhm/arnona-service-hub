import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

const RECENT_KEY = 'arnona-hub:recent';
const MAX_RECENT = 5;

export function useRecent() {
  const [recentIds, setRecentIds] = useLocalStorage<string[]>(RECENT_KEY, []);

  const addRecent = useCallback(
    (id: string) => {
      setRecentIds((prev) => {
        const withoutId = prev.filter((r) => r !== id);
        return [id, ...withoutId].slice(0, MAX_RECENT);
      });
    },
    [setRecentIds]
  );

  return { recentIds, addRecent };
}
