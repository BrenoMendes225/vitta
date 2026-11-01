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
  theme: 'auto',
  units: 'metric',
  remindersEnabled: false,
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
  // carrega perfil para decidir onboarding
  try {
    const { supabase } = await import('./supabase.js');
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      const { data: profile } = await supabase.from('profiles').select('name,birth_date,onboarding_concluido,onboarding_concluido_at,height').eq('id', user.id).maybeSingle();
      if (profile) {
        // migra dados do perfil para settings se faltarem
        const patch = {};
        if (profile.name && !state.settings.name) patch.name = profile.name;
        if (profile.birth_date && !state.settings.birthDate) patch.birthDate = profile.birth_date;
        if (profile.height && !state.settings.height) patch.height = profile.height;
        if (Object.keys(patch).length) {
          state.settings = merge(state.settings, patch);
        }
        const hasDados = !!(profile.name || state.settings.name || state.settings.startWeight || state.settings.goalWeight || state.settings.height);
        const onboardingDone = profile.onboarding_concluido === true || hasDados;
        if (onboardingDone && !profile.onboarding_concluido) {
          // migra conta antiga com dados para concluída
          await supabase.from('profiles').upsert({
            id: user.id,
            onboarding_concluido: true,
            onboarding_concluido_at: new Date().toISOString(),
          }, { onConflict: 'id' });
        }
        if (onboardingDone) {
          state.settings.onboarded = true;
          state.settings._profileOnboarded = true;
        }
      }
    }
  } catch {}
  state.ready = true;
  return state.settings;
}

export async function saveSettings(patch) {
  state.settings = merge(state.settings, patch);
  await setKV('settings', state.settings);
  emit('settings', state.settings);
  // sincroniza campos de perfil na conta
  try {
    const { supabase } = await import('./supabase.js');
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      const profilePatch = {};
      if (state.settings.name !== undefined) profilePatch.name = state.settings.name || null;
      if (state.settings.birthDate !== undefined) profilePatch.birth_date = state.settings.birthDate || null;
      if (state.settings.height !== undefined) profilePatch.height = state.settings.height ?? null;
      // mantém onboarding se já concluído
      if (state.settings.onboarded) {
        profilePatch.onboarding_concluido = true;
        if (!state.settings._profileOnboardedAt) {
          // não sobrescreve data existente
        }
      }
      await supabase.from('profiles').upsert({ id: user.id, ...profilePatch }, { onConflict: 'id' });
    }
  } catch {}
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
