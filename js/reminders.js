/* Reminders: notificações suaves via Notification API */
import { state } from './store.js';

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
  setTimeout(() => {
    notify(title, body);
  }, ms);
}

export async function startReminders() {
  const st = state.settings;
  if (!st?.remindersEnabled) return;
  const granted = await requestPermission();
  if (!granted) return;

  // água 10h, 15h, 20h
  [10, 15, 20].forEach(h => {
    scheduleOnce(getNext(h), 'Vitta - Hidratação', 'Que tal um gole de água agora? Constância, não perfeição.');
  });
  // proteína 12h
  scheduleOnce(getNext(12), 'Vitta - Proteína', 'Hora de conferir sua proteína do dia.');
}

export async function initReminders() {
  if (state.settings?.remindersEnabled) {
    await startReminders();
  }
}
