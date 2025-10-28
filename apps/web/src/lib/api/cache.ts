interface PersistedCacheEntry<T> {
  data: T;
  savedAt: number;
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch (error) {
    return null;
  }
}

export function persistCache<T>(key: string, data: T): void {
  const storage = getStorage();
  if (!storage) return;

  const entry: PersistedCacheEntry<T> = {
    data,
    savedAt: Date.now(),
  };

  try {
    storage.setItem(key, JSON.stringify(entry));
  } catch {
    // Ignore write errors (e.g. storage quota exceeded)
  }
}

export function readCache<T>(key: string): T | null {
  const storage = getStorage();
  if (!storage) return null;

  const raw = storage.getItem(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PersistedCacheEntry<T>;
    return parsed.data;
  } catch (error) {
    storage.removeItem(key);
    return null;
  }
}

export function removeCache(key: string): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(key);
  } catch {
    // Ignore removal errors
  }
}
