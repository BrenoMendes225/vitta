/* Reminders: notificações suaves via Notification API */
import { state } from './store.js';

const timers = [];
const clearReminders = () => {
  timers.forEach(id => clearTimeout(id));
  timers.length = 0;
};

const getNext = (hour, minute = 0) => {
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next;
};

export async function requestPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const perm = await Notification.requestPermission();
  return perm === 'granted';
}

export function notify(title, body) {
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, silent: true });
  } catch (_) {}
}

export function scheduleOnce(date, title, body) {
  const ms = date.getTime() - Date.now();
  if (ms <= 0) return;
  const id = setTimeout(() => {
    notify(title, body);
  }, ms);
  timers.push(id);
}

export async function startReminders() {
  clearReminders();
  const st = state.settings;
  if (!st?.remindersEnabled) return;
  const granted = await requestPermission();
  if (!granted) return;

  // pesagem matinal
  scheduleOnce(getNext(7), 'Vitta', 'Bom dia. Se puder, pese em jejum quando for confortável.');
  // água
  scheduleOnce(getNext(10), 'Vitta', 'Um momento gentil: que tal se hidratar agora?');
  scheduleOnce(getNext(15), 'Vitta', 'Água com carinho ajuda seu corpo. Um gole agora?');
  scheduleOnce(getNext(20), 'Vitta', 'Encerrando o dia com calma. Hidratação suave?');
  // proteína
  scheduleOnce(getNext(12), 'Vitta', 'Como está sua proteína hoje? Pequenos passos contam.');
  // aplicação lembrete baseado em intervalo
  const inj = st.injection || {};
  if (inj.startDate && inj.intervalDays) {
    try {
      const start = new Date(inj.startDate);
      const days = Math.floor((Date.now() - start.getTime()) / 86400000);
      const nextDay = inj.intervalDays - (days % inj.intervalDays);
      const nextInj = new Date();
      nextInj.setDate(nextInj.getDate() + nextDay);
      nextInj.setHours(9, 0, 0, 0);
      scheduleOnce(nextInj, 'Vitta', 'Lembrete suave: dia de aplicação. Escolha o local com cuidado.');
    } catch {}
  }
}

export async function initReminders() {
  if (state.settings?.remindersEnabled) {
    await startReminders();
  }
}
