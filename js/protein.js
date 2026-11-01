import { getKV, setKV } from './supabase-db.js';
import { todayISO, nowHM } from './date.js';

export const proteinKey = (date) => `protein:${date}`;
export const proteinEntriesKey = (date) => `proteinEntries:${date}`;

async function migrateIfNeeded(date) {
  const entries = await getKV(proteinEntriesKey(date), null);
  if (entries !== null) return;
  const total = Number(await getKV(proteinKey(date), 0)) || 0;
  if (total > 0) {
    await setKV(proteinEntriesKey(date), [{ id: crypto.randomUUID(), g: total, time: nowHM() }]);
  }
}

export async function getProtein(date = todayISO()) {
  await migrateIfNeeded(date);
  const entries = await getKV(proteinEntriesKey(date), []);
  const sum = entries.reduce((s, e) => s + Number(e.g || 0), 0);
  await setKV(proteinKey(date), sum);
  return sum;
}

export async function getProteinEntries(date = todayISO()) {
  await migrateIfNeeded(date);
  return await getKV(proteinEntriesKey(date), []);
}

export async function setProtein(g, date = todayISO()) {
  const value = Math.max(0, Number(g) || 0);
  await setKV(proteinKey(date), value);
  await setKV(proteinEntriesKey(date), [{ id: crypto.randomUUID(), g: value, time: nowHM() }]);
  return value;
}

export async function addProtein(g, date = todayISO()) {
  await migrateIfNeeded(date);
  const entries = await getKV(proteinEntriesKey(date), []);
  entries.push({ id: crypto.randomUUID(), g: Number(g), time: nowHM() });
  await setKV(proteinEntriesKey(date), entries);
  const sum = entries.reduce((s, e) => s + Number(e.g || 0), 0);
  await setKV(proteinKey(date), sum);
  return sum;
}

export async function removeProteinEntry(id, date = todayISO()) {
  await migrateIfNeeded(date);
  const entries = await getKV(proteinEntriesKey(date), []);
  const filtered = entries.filter(e => e.id !== id);
  await setKV(proteinEntriesKey(date), filtered);
  const sum = filtered.reduce((s, e) => s + Number(e.g || 0), 0);
  await setKV(proteinKey(date), sum);
  return sum;
}
