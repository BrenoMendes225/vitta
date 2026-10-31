import * as supabaseDb from './supabase-db.js';
import * as indexedDb from './db-indexed.js';

async function isAuthenticated() {
  try {
    const mod = await import('./supabase.js');
    const { data: { user } } = await mod.supabase.auth.getUser();
    return !!user;
  } catch { return false; }
}

const handler = {
  get(target, prop) {
    return async (...args) => {
      const auth = await isAuthenticated();
      if (auth) {
        const fn = supabaseDb[prop];
        if (typeof fn === 'function') return fn(...args);
      }
      const fn = indexedDb[prop];
      if (typeof fn === 'function') return fn(...args);
      throw new Error(`Método ${prop} não encontrado`);
    };
  }
};

export default new Proxy({}, handler);
export const uid = (...args) => indexedDb.uid(...args);
