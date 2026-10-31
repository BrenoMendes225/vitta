/* Estado global: configurações + barramento simples de eventos. */

import { getKV, setKV } from './supabase-db.js';

export const APP = {
  name: 'Vitta',
  version: '0.1.0',
  tagline: 'constância, não perfeição',
};

export const DEFAULT_SETTINGS = {
  onboarded: false,
  name: '',
  birthDate: '',
  height: null,
  startWeight: null,
  goalWeight: null,
  proteinGoal: 120,
  waterGoal: 2500,
  kcalGoal: null,
  injection: {
    name: '',
    dose: '',
    unit: 'mg',
    intervalDays: 7,
    startDate: '',
    sites: ['abdômen D', 'abdômen E', 'coxa D', 'coxa E'],
  },
  gemini: {
    key: '',
    model: 'gemini-2.5-flash',
  },
};

export const state = {
  settings: structuredClone(DEFAULT_SETTINGS),
  ready: false,
};

const listeners = new Map();

export function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(fn);
  return () => listeners.get(event)?.delete(fn);
}

export function emit(event, payload) {
  listeners.get(event)?.forEach((fn) => {
    try { fn(payload); } catch (err) { console.error(err); }
  });
}

function isPlain(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function merge(base, patch) {
  const out = { ...base };
  for (const [k, v] of Object.entries(patch || {})) {
    if (v === undefined) continue;
    out[k] = isPlain(v) && isPlain(base[k]) ? merge(base[k], v) : v;
  }
  return out;
}

export async function loadSettings() {
  const saved = await getKV('settings');
  state.settings = merge(structuredClone(DEFAULT_SETTINGS), saved || {});
  state.ready = true;
  return state.settings;
}

export async function saveSettings(patch) {
  state.settings = merge(state.settings, patch);
  await setKV('settings', state.settings);
  emit('settings', state.settings);
  return state.settings;
}

export const s = () => state.settings;

/* Atalhos de metas com valores sensatos */
export const goals = () => {
  const st = state.settings;
  return {
    water: Number(st.waterGoal) || 2500,
    protein: Number(st.proteinGoal) || 0,
    kcal: Number(st.kcalGoal) || 0,
    goalWeight: Number(st.goalWeight) || null,
    startWeight: Number(st.startWeight) || null,
  };
};
