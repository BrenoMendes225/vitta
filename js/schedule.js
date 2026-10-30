/* Esquema de aplicações: próxima data, dose e rodízio de local. */

import { addDays, diffDays, todayISO } from './date.js';

export function sortInjections(rows) {
  return [...rows].sort((a, b) => (a.date || '').localeCompare(b.date || '')
    || (a.createdAt || '').localeCompare(b.createdAt || ''));
}

export function doseLabel(injection = {}, dose) {
  const value = dose ?? injection.dose;
  if (!value) return '';
  const unit = injection.unit || 'mg';
  return `${value} ${unit}`.trim();
}

export function nextInjection(settings, injections = []) {
  const cfg = settings?.injection || {};
  const interval = Math.max(1, Number(cfg.intervalDays) || 7);
  const rows = sortInjections(injections);
  const last = rows[rows.length - 1] || null;
  const base = last?.date || cfg.startDate || null;
  if (!base) return null;

  const date = addDays(base, interval);
  const sites = Array.isArray(cfg.sites) && cfg.sites.length ? cfg.sites : ['abdômen', 'coxa'];
  const index = rows.length % sites.length;

  return {
    date,
    days: diffDays(todayISO(), date),
    dose: last?.dose ?? cfg.dose ?? '',
    site: sites[index],
    siteIndex: index,
    last,
    sites,
  };
}

export function siteUsage(injections = [], sites = []) {
  const counts = new Map(sites.map((s) => [s, 0]));
  for (const inj of injections) {
    if (!inj.site) continue;
    counts.set(inj.site, (counts.get(inj.site) || 0) + 1);
  }
  return counts;
}
