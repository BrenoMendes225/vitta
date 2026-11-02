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
  // mapeia camelCase -> snake_case para colunas de auditoria e fotos
  if (payload.createdAt) { payload.created_at = payload.createdAt; delete payload.createdAt; }
  if (payload.updatedAt) { delete payload.updatedAt; }
  if (payload.photoId) { payload.photo_id = payload.photoId; delete payload.photoId; }
  // mapeamentos específicos por tabela
  if (t === 'meals') {
    if (payload.text !== undefined) { payload.description = payload.text; delete payload.text; }
    if (payload.type !== undefined) { payload.meal_type = payload.type; delete payload.type; }
  }
  try {
    const { error } = await supabase.from(t).upsert(payload);
    if (error) throw error;
  } catch (e) {
    console.error('[Vitta DB] erro ao salvar', t, e);
    throw new Error('Não foi possível salvar agora. Seus dados estão seguros no aparelho e serão sincronizados em breve.');
  }
  return payload;
}

export async function get(store, key) {
  const { name: t, userId } = await table(store);
  if (!userId) return null;
  const { data, error } = await supabase.from(t).select('*').eq('id', key).eq('user_id', userId).single();
  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;
  const out = { ...data, createdAt: data.created_at, updatedAt: data.updated_at, photoId: data.photo_id };
  if (t === 'meals') {
    if (data.description !== undefined) out.text = data.description;
    if (data.meal_type !== undefined) out.type = data.meal_type;
  }
  return out;
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
  return (data || []).map(r => {
    const out = { ...r, createdAt: r.created_at, updatedAt: r.updated_at, photoId: r.photo_id };
    if (t === 'meals') {
      if (r.description !== undefined) out.text = r.description;
      if (r.meal_type !== undefined) out.type = r.meal_type;
    }
    return out;
  });
}

export async function byDate(store, date) {
  const { name: t, userId } = await table(store);
  if (!userId) return [];
  const { data, error } = await supabase.from(t).select('*').eq('user_id', userId).eq('date', date);
  if (error) throw error;
  return (data || []).map(r => {
    const out = { ...r, createdAt: r.created_at, updatedAt: r.updated_at, photoId: r.photo_id };
    if (t === 'meals') {
      if (r.description !== undefined) out.text = r.description;
      if (r.meal_type !== undefined) out.type = r.meal_type;
    }
    return out;
  });
}

export async function inRange(store, fromISO, toISO) {
  const { name: t, userId } = await table(store);
  if (!userId) return [];
  const { data, error } = await supabase.from(t).select('*')
    .eq('user_id', userId)
    .gte('date', fromISO)
    .lte('date', toISO);
  if (error) throw error;
  return (data || []).map(r => {
    const out = { ...r, createdAt: r.created_at, updatedAt: r.updated_at, photoId: r.photo_id };
    if (t === 'meals') {
      if (r.description !== undefined) out.text = r.description;
      if (r.meal_type !== undefined) out.type = r.meal_type;
    }
    return out;
  });
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

/* Photos helper – upload para Supabase Storage */
export async function savePhoto(blob, meta = {}) {
  const userId = await getUserId();
  if (!userId || !blob) return null;

  const id = crypto.randomUUID();
  const ext = blob.type.includes('png') ? 'png' : 'jpeg';
  const path = `${userId}/${id}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from('vitta-photos')
    .upload(path, blob, { upsert: false, contentType: blob.type });

  if (upErr) throw upErr;

  const { data } = supabase.storage.from('vitta-photos').getPublicUrl(path);
  const url = data.publicUrl;

  await supabase.from('photos').insert({
    id,
    user_id: userId,
    date: meta.date || new Date().toISOString().slice(0,10),
    kind: meta.kind || 'weight',
    url,
    note: ''
  });

  return { id, url };
}
