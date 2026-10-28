/** Music files the host added, kept in IndexedDB so they survive reloads and work offline. */
export interface TrackInfo {
  id: string;
  name: string;
}

interface StoredTrack extends TrackInfo {
  added: number;
  blob: Blob;
}

const DB_NAME = 'sus-me-st';
const STORE = 'tracks';

let db: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  db ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return db;
}

async function run<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const store = (await open()).transaction(STORE, mode).objectStore(STORE);
  return new Promise((resolve, reject) => {
    const request = action(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Oldest first. */
export async function listTracks(): Promise<TrackInfo[]> {
  const all = (await run('readonly', (s) => s.getAll())) as StoredTrack[];
  return all.sort((a, b) => a.added - b.added).map(({ id, name }) => ({ id, name }));
}

export async function addTrack(file: File): Promise<TrackInfo> {
  const track: StoredTrack = {
    id: crypto.randomUUID(),
    name: file.name.replace(/\.[^.]+$/, ''),
    added: Date.now(),
    blob: file,
  };
  await run('readwrite', (s) => s.put(track));
  return { id: track.id, name: track.name };
}

export async function removeTrack(id: string): Promise<void> {
  await run('readwrite', (s) => s.delete(id));
}

export async function loadTrack(id: string): Promise<Blob | null> {
  const track = (await run('readonly', (s) => s.get(id))) as StoredTrack | undefined;
  return track?.blob ?? null;
}
