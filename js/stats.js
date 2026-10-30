/* Estatísticas derivadas — peso, médias, totais de refeições. */

import { addDays, rangeDays } from './date.js';

export function sortAsc(rows) {
  return [...rows].sort((a, b) => (a.date || '').localeCompare(b.date || '')
    || (a.createdAt || '').localeCompare(b.createdAt || ''));
}

/** Um registro por dia (o último do dia vence), ordenado. */
export function dailyWeights(rows) {
  const map = new Map();
  for (const r of sortAsc(rows)) {
    if (!Number.isFinite(Number(r.kg))) continue;
    map.set(r.date, { date: r.date, value: Number(r.kg), id: r.id });
  }
  return [...map.values()];
}

export function movingAverage(points, window = 7) {
  return points.map((p) => {
    const from = addDays(p.date, -(window - 1));
    const slice = points.filter((x) => x.date >= from && x.date <= p.date);
    const avg = slice.reduce((a, b) => a + b.value, 0) / (slice.length || 1);
    return { ...p, ma: Number(avg.toFixed(2)) };
  });
}

/** Média dos registros na janela que termina em `endISO` (inclusive). */
export function windowAverage(points, endISO, days = 7) {
  const from = addDays(endISO, -(days - 1));
  const slice = points.filter((p) => p.date >= from && p.date <= endISO);
  if (!slice.length) return null;
  return slice.reduce((a, b) => a + b.value, 0) / slice.length;
}

export function weightSummary(rows, settings = {}) {
  const daily = dailyWeights(rows);
  const withMa = movingAverage(daily);
  const latest = daily[daily.length - 1] || null;
  const end = latest?.date || null;

  const maNow = end ? windowAverage(daily, end, 7) : null;
  const maPrev = end ? windowAverage(daily, addDays(end, -7), 7) : null;
  const ma30 = end ? windowAverage(daily, addDays(end, -30), 7) : null;

  const startWeight = Number(settings.startWeight) || daily[0]?.value || null;
  const goalWeight = Number(settings.goalWeight) || null;

  let progress = null;
  if (startWeight && goalWeight && latest && startWeight !== goalWeight) {
    progress = (startWeight - latest.value) / (startWeight - goalWeight);
  }

  return {
    daily,
    withMa,
    latest,
    startWeight,
    goalWeight,
    maNow,
    maPrev,
    ma30,
    delta7: maNow != null && maPrev != null ? maNow - maPrev : null,
    delta30: maNow != null && ma30 != null ? maNow - ma30 : null,
    total: startWeight != null && latest ? latest.value - startWeight : null,
    remaining: goalWeight != null && latest ? latest.value - goalWeight : null,
    progress: progress == null ? null : Math.max(0, Math.min(1, progress)),
  };
}

export function mealTotals(meals) {
  return meals.reduce((acc, m) => {
    acc.kcal += Number(m.kcal) || 0;
    acc.protein += Number(m.protein) || 0;
    acc.carbs += Number(m.carbs) || 0;
    acc.fat += Number(m.fat) || 0;
    acc.count += 1;
    return acc;
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0, count: 0 });
}

export function byDay(rows, days, endISO) {
  const out = new Map();
  for (const iso of rangeDays(addDays(endISO, -(days - 1)), endISO)) out.set(iso, []);
  for (const r of rows) if (out.has(r.date)) out.get(r.date).push(r);
  return out;
}

export function streak(dates, endISO) {
  const set = new Set(dates);
  let count = 0;
  let cursor = endISO;
  if (!set.has(cursor)) cursor = addDays(cursor, -1);
  while (set.has(cursor)) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}
