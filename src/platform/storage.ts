/** JSON in localStorage. Never throws: storage can be full, blocked or corrupt. */
export function load(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Could not save ${key}`, error);
  }
}

export function forget(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing to forget when storage is unavailable.
  }
}

/** Best effort: asks the browser not to evict this origin's storage. */
export function persistStorage(): void {
  navigator.storage?.persist?.().catch(() => {});
}
