/* Água do dia — guardada em kv como `water:YYYY-MM-DD`. */

import { getKV, setKV } from './supabase-db.js';
import { todayISO, nowHM } from './date.js';

export const waterKey = (date) => `water:${date}`;
export const waterEntriesKey = (date) => `waterEntries:${date}`;

async function migrateIfNeeded(date) {
  const entries = await getKV(waterEntriesKey(date), null);
  if (entries !== null) return;
  const total = Number(await getKV(waterKey(date), 0)) || 0;
  if (total > 0) {
    await setKV(waterEntriesKey(date), [{ id: crypto.randomUUID(), ml: total, time: nowHM() }]);
  }
}

export async function getWater(date = todayISO()) {
  await migrateIfNeeded(date);
  const entries = await getKV(waterEntriesKey(date), []);
  const sum = entries.reduce((s, e) => s + Number(e.ml || 0), 0);
  // keep legacy key in sync
  await setKV(waterKey(date), sum);
  return sum;
}

export async function getWaterEntries(date = todayISO()) {
  await migrateIfNeeded(date);
  const entries = await getKV(waterEntriesKey(date), []);
  return entries;
}

export async function setWater(ml, date = todayISO()) {
  const value = Math.max(0, Math.round(Number(ml) || 0));
  await setKV(waterKey(date), value);
  // replace entries with one entry
  await setKV(waterEntriesKey(date), [{ id: crypto.randomUUID(), ml: value, time: nowHM() }]);
  return value;
}

export async function addWater(ml, date = todayISO()) {
  await migrateIfNeeded(date);
  const entries = await getKV(waterEntriesKey(date), []);
  const id = crypto.randomUUID();
  entries.push({ id, ml: Number(ml), time: nowHM() });
  await setKV(waterEntriesKey(date), entries);
  const sum = entries.reduce((s, e) => s + Number(e.ml || 0), 0);
  await setKV(waterKey(date), sum);
  return { sum, id };
}

export async function removeWaterEntry(id, date = todayISO()) {
  await migrateIfNeeded(date);
  const entries = await getKV(waterEntriesKey(date), []);
  const filtered = entries.filter(e => e.id !== id);
  await setKV(waterEntriesKey(date), filtered);
  const sum = filtered.reduce((s, e) => s + Number(e.ml || 0), 0);
  await setKV(waterKey(date), sum);
  return sum;
}

export function waterStreak(days, waterByDate) {
  let count = 0;
  for (const d of days) {
    if ((waterByDate[d] || 0) > 0) count++;
  }
  return count;
}
