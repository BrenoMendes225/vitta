/* "Dia ruim" — dias difíceis não quebram a jornada.
   Um dia marcado aqui ganha tom acolhedor no app e não zera streaks. */

import * as db from './db.js';
import { todayISO, addDays } from './date.js';

export const MOODS = {
  ruim: {
    key: 'ruim',
    label: 'Dia difícil',
    emoji: '🌧️',
    color: 'var(--mut)',
    title: 'Hoje foi um dia difícil',
    message: 'Sem metas e sem cobrança. Um dia ruim não apaga o que você construiu até aqui.',
    short: 'Um dia difícil',
  },
  travado: {
    key: 'travado',
    label: 'Sem energia',
    emoji: '😴',
    color: 'var(--mut)',
    title: 'Hoje está sem energia',
    message: 'Descansar também é parte do processo. Registrar o mínimo já conta.',
    short: 'Sem energia',
  },
  neutro: {
    key: 'neutro',
    label: 'Dia normal',
    emoji: '☁️',
    color: 'var(--mut)',
    title: 'Um dia assim e pronto',
    message: 'Nem todo dia precisa ser motivation. Registrar sem julgamento já é manter o ritmo.',
    short: 'Dia normal',
  },
};

/** Motivos rápidos que o usuário pode tocar. */
export const REASONS = [
  'Comi fora do plano',
  'Fome demais',
  'Estresse ou ansiedade',
  'Dormi mal',
  'Festa / evento',
  'Sem tempo',
  'Fome emocional',
  'Outro motivo',
];

/** Retorna o registro de humor de um dia (ou null). */
export async function getMood(date = todayISO()) {
  const rows = await db.byDate('daymoods', date);
  return rows[0] || null;
}

/** Todos os dias marcados (ordenados). */
export async function allMoods() {
  const rows = await db.all('daymoods');
  return rows.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
}

/** Mapa date -> registro, para uso rápido nas telas. */
export async function moodMap() {
  const map = new Map();
  for (const row of await allMoods()) map.set(row.date, row);
  return map;
}

/** Marca (ou atualiza) o dia. `mood` é uma chave de MOODS. */
export async function setMood(date, mood, note = '', reason = '') {
  const meta = MOODS[mood] || MOODS.ruim;
  const existing = await getMood(date);
  const record = {
    ...(existing || {}),
    id: existing?.id,
    date,
    mood: meta.key,
    note: String(note || '').trim(),
    reason: String(reason || '').trim(),
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await db.put('daymoods', record);
  return record;
}

/** Remove a marcação do dia. */
export async function clearMood(date) {
  const existing = await getMood(date);
  if (!existing) return false;
  await db.remove('daymoods', existing.id);
  return true;
}

/** O dia está marcado como difícil? */
export async function isBadDay(date = todayISO()) {
  const row = await getMood(date);
  return !!row;
}

/**
 * Streak que ignora dias marcados como difíceis.
 * Dias difíceis contam como "pausa" — não quebram a sequência.
 */
export function streakWithBadDays(dates, endISO, badDates = new Set()) {
  const set = new Set(dates);
  let count = 0;
  let cursor = endISO;
  if (!set.has(cursor)) {
    if (badDates.has(cursor)) return streakWithBadDays(dates, addDays(cursor, -1), badDates);
    cursor = addDays(cursor, -1);
  }
  while (set.has(cursor)) {
    count++;
    cursor = addDays(cursor, -1);
    // pula dias difíceis que não tiveram registro
    let guard = 0;
    while (!set.has(cursor) && badDates.has(cursor) && guard++ < 400) {
      count++;
      cursor = addDays(cursor, -1);
    }
  }
  return count;
}

/** Frases de acolhimento — nunca cobram, nunca julgam. */
export const SUPPORT = [
  'Um dia ruim não define a sua jornada.',
  'Você voltou. Isso é o que importa.',
  'Constância não é nunca falhar — é continuar tentando.',
  'Amanhã é outro dia, e você ainda tem ele.',
  'Progresso também se faz nos dias difíceis.',
  'Perder o dia não apaga os outros.',
];

export function randomSupport(seed = Date.now()) {
  return SUPPORT[Math.abs(seed) % SUPPORT.length];
}
