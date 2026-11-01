/* Camada de dados usando Supabase como fonte de verdade */
import { supabase } from './supabase.js';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

async function table(name) {
  const userId = await getUserId();
  if (!userId) return { name, userId: null };
  return { name, userId };
}

export async function uid() {
  return crypto.randomUUID();
}

export async function put(store, record) {
  const { name: t, userId } = await table(store);
  if (!userId) return record;
  const payload = { ...record, user_id: userId };
  if (!payload.id) payload.id = crypto.randomUUID();
  const { error } = await supabase.from(t).upsert(payload);
  if (error) throw error;
  return payload;
}

export async function get(store, key) {
  const { name: t, userId } = await table(store);
  if (!userId) return null;
  const { data, error } = await supabase.from(t).select('*').eq('id', key).eq('user_id', userId).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function remove(store, key) {
  const { name: t, userId } = await table(store);
  if (!userId) return false;
  const { error } = await supabase.from(t).delete().eq('id', key).eq('user_id', userId);
  if (error) throw error;
  return true;
}

export async function all(store) {
  const { name: t, userId } = await table(store);
  if (!userId) return [];
  const { data, error } = await supabase.from(t).select('*').eq('user_id', userId).order('date', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function byDate(store, date) {
  const { name: t, userId } = await table(store);
  if (!userId) return [];
  const { data, error } = await supabase.from(t).select('*').eq('user_id', userId).eq('date', date);
  if (error) throw error;
  return data || [];
}

export async function inRange(store, fromISO, toISO) {
  const { name: t, userId } = await table(store);
  if (!userId) return [];
  const { data, error } = await supabase.from(t).select('*')
    .eq('user_id', userId)
    .gte('date', fromISO)
    .lte('date', toISO);
  if (error) throw error;
  return data || [];
}

export async function count(store) {
  const rows = await all(store);
  return rows.length;
}

/* KV / settings */
export async function getKV(k, fallback = null) {
  const userId = await getUserId();
  if (!userId) return fallback;
  const { data, error } = await supabase.from('settings').select('data').eq('user_id', userId).single();
  if (error && error.code !== 'PGRST116') throw error;
  const val = data?.data?.[k];
  return val !== undefined ? val : fallback;
}

export async function setKV(k, v) {
  const userId = await getUserId();
  if (!userId) return;
  const { data: existing } = await supabase.from('settings').select('data').eq('user_id', userId).single();
  const merged = { ...(existing?.data || {}), [k]: v };
  const { error } = await supabase.from('settings').upsert({ user_id: userId, data: merged });
  if (error) throw error;
}

export async function kvAll() {
  const userId = await getUserId();
  if (!userId) return {};
  const { data, error } = await supabase.from('settings').select('data').eq('user_id', userId).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data?.data || {};
}

/* export/import */
export async function exportAll() {
  const stores = ['weights','measurements','meals','workouts','symptoms','injections'];
  const out = { app: 'vitta', exportedAt: new Date().toISOString(), stores: {} };
  for (const s of stores) out.stores[s] = await all(s);
  return out;
}

export async function importAll(data) {
  if (!data?.stores) throw new Error('Arquivo inválido');
  let total = 0;
  for (const [name, rows] of Object.entries(data.stores)) {
    for (const row of rows) {
      await put(name, row);
      total++;
    }
  }
  return total;
}

/* Photos helper – mantém compatibilidade com a tela atual */
export async function savePhoto(blob, meta = {}) {
  const { name: t, userId } = await table('photos');
  if (!userId) return null;
  // Por simplicidade, não faz upload real. Guarda metadados.
  const id = crypto.randomUUID();
  const record = { id, user_id: userId, date: meta.date || new Date().toISOString().slice(0,10), kind: meta.kind || 'weight', url: '', note: '' };
  const { error } = await supabase.from('photos').insert(record);
  if (error) throw error;
  return { id, url: '' };
}
