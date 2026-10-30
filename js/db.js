/* Camada de dados: IndexedDB puro, sem dependências.
   Tudo fica no aparelho. `kv` guarda configurações e valores simples (água do dia). */

const DB_NAME = 'vitta';
const DB_VERSION = 2;

const DEFS = {
  kv: { key: 'k' },
  weights: { key: 'id', idx: ['date'] },
  measurements: { key: 'id', idx: ['date'] },
  meals: { key: 'id', idx: ['date'] },
  injections: { key: 'id', idx: ['date'] },
  symptoms: { key: 'id', idx: ['date'] },
  workouts: { key: 'id', idx: ['date'] },
  photos: { key: 'id', idx: ['date'] },
};

let dbPromise = null;

export function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const [name, def] of Object.entries(DEFS)) {
        if (db.objectStoreNames.contains(name)) continue;
        const store = db.createObjectStore(name, { keyPath: def.key });
        for (const idx of def.idx || []) store.createIndex(idx, idx, { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    // outra aba pode estar com o banco aberto: espera ela fechar em vez de quebrar
    req.onblocked = () => console.warn('IndexedDB bloqueado por outra aba. Aguardando…');
  });
  return dbPromise;
}

export async function put(store, record) {
  const db = await openDB();
  if (DEFS[store].key === 'id' && !record.id) record.id = uid();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, 'readwrite');
    t.objectStore(store).put(record);
    t.oncomplete = () => resolve(record);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export async function get(store, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, 'readonly');
    const req = t.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function remove(store, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, 'readwrite');
    t.objectStore(store).delete(key);
    t.oncomplete = () => resolve(true);
    t.onerror = () => reject(t.error);
  });
}

export async function all(store) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, 'readonly');
    const req = t.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function byDate(store, date) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, 'readonly');
    const req = t.objectStore(store).index('date').getAll(IDBKeyRange.only(date));
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function inRange(store, fromISO, toISOValue) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, 'readonly');
    const req = t.objectStore(store).index('date').getAll(IDBKeyRange.bound(fromISO, toISOValue));
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function count(store) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, 'readonly');
    const req = t.objectStore(store).count();
    req.onsuccess = () => resolve(req.result || 0);
    req.onerror = () => reject(req.error);
  });
}

/* ---- chave/valor ---- */

export async function getKV(k, fallback = null) {
  const row = await get('kv', k);
  return row ? row.v : fallback;
}

export async function setKV(k, v) {
  return put('kv', { k, v });
}

export async function kvAll() {
  return all('kv');
}

/* ---- fotos ---- */

export async function savePhoto(blob, meta = {}) {
  const rec = { id: uid(), blob, date: meta.date || new Date().toISOString().slice(0, 10), ...meta };
  await put('photos', rec);
  return rec;
}

export async function getPhotoURL(id) {
  const rec = await get('photos', id);
  if (!rec?.blob) return null;
  return URL.createObjectURL(rec.blob);
}

/* ---- manutenção ---- */

export async function exportAll() {
  const data = { app: 'vitta', version: DB_VERSION, exportedAt: new Date().toISOString(), stores: {} };
  for (const name of Object.keys(DEFS)) {
    if (name === 'photos') continue; // fotos ficam de fora do JSON (arquivos binários)
    data.stores[name] = await all(name);
  }
  return data;
}

export async function importAll(data, { replace = false } = {}) {
  if (!data?.stores) throw new Error('Arquivo inválido.');
  if (replace) await wipe();
  let total = 0;
  for (const [name, rows] of Object.entries(data.stores)) {
    if (!DEFS[name] || name === 'photos' || !Array.isArray(rows)) continue;
    for (const row of rows) {
      await put(name, row);
      total++;
    }
  }
  return total;
}

export async function wipe() {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const t = db.transaction(Object.keys(DEFS), 'readwrite');
    for (const name of Object.keys(DEFS)) t.objectStore(name).clear();
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}
