/* Água do dia — guardada em kv como `water:YYYY-MM-DD`. */

import { getKV, setKV } from './supabase-db.js';
import { todayISO } from './date.js';

export const waterKey = (date) => `water:${date}`;

export async function getWater(date = todayISO()) {
  return Number(await getKV(waterKey(date), 0)) || 0;
}

export async function setWater(ml, date = todayISO()) {
  const value = Math.max(0, Math.round(Number(ml) || 0));
  await setKV(waterKey(date), value);
  return value;
}

export async function addWater(ml, date = todayISO()) {
  const current = await getWater(date);
  return setWater(current + Number(ml || 0), date);
}

export function waterStreak(days, waterByDate) {
  let count = 0;
  for (const d of days) {
    if ((waterByDate[d] || 0) > 0) count++;
  }
  return count;
}
