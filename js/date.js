/* Utilitários de data — tudo em ISO local (YYYY-MM-DD), sem sustos de fuso. */

export const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
export const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const todayISO = () => toISO(new Date());

export function parseISO(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

export function addDays(iso, n) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function diffDays(fromISO, toISOValue) {
  return Math.round((parseISO(toISOValue) - parseISO(fromISO)) / 86400000);
}

export function weekday(iso, short = false) {
  const i = parseISO(iso).getDay();
  return short ? WEEKDAYS_SHORT[i] : WEEKDAYS[i];
}

export function fmtShort(iso) {
  const d = parseISO(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function fmtShortYear(iso) {
  const d = parseISO(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function fmtLong(iso) {
  const d = parseISO(iso);
  return `${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

export function fmtMonthYear(iso) {
  const d = parseISO(iso);
  return `${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
}

export function humanDate(iso) {
  if (!iso) return '';
  const today = todayISO();
  if (iso === today) return 'Hoje';
  if (iso === addDays(today, -1)) return 'Ontem';
  if (iso === addDays(today, 1)) return 'Amanhã';
  const d = parseISO(iso);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

export function relativeDays(iso) {
  const n = diffDays(todayISO(), iso);
  if (n === 0) return 'hoje';
  if (n === 1) return 'amanhã';
  if (n === -1) return 'ontem';
  if (n > 1) return `em ${n} dias`;
  return `há ${Math.abs(n)} dias`;
}

export function rangeDays(fromISO, toISOValue) {
  const out = [];
  let cur = fromISO;
  let guard = 0;
  while (diffDays(cur, toISOValue) >= 0 && guard++ < 2000) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

export function startOfWeek(iso) {
  const d = parseISO(iso);
  const shift = (d.getDay() + 6) % 7; // segunda como início
  return addDays(iso, -shift);
}

export function nowHM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Boa noite';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

export function ageFrom(birthISO) {
  if (!birthISO) return null;
  const b = parseISO(birthISO);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}
