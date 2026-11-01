/* Bootstrap do app. */

import { loadSettings, state, APP, on } from './store.js';
import { startRouter, go, parsePath } from './router.js';
import { icon } from './icons.js';
import { openSheet, closeSheet } from './ui.js';

const TABS = [
  { tab: 'hoje', path: 'hoje', label: 'Hoje', icon: 'home' },
  { tab: 'diario', path: 'diario', label: 'Diário', icon: 'bowl' },
  { tab: 'peso', path: 'peso', label: 'Peso', icon: 'scale' },
  { tab: 'aplicacoes', path: 'aplicacoes', label: 'Aplicações', icon: 'syringe' },
  { tab: 'mais', path: 'mais', label: 'Mais', icon: 'grid' },
];

function buildTabbar() {
  const nav = document.getElementById('tabbar');
  nav.innerHTML = TABS.map((t) => `
    <a href="#/${t.path}" data-tab="${t.tab}" aria-label="${t.label}">
      ${icon(t.icon, 23, 1.9)}
      <span>${t.label}</span>
    </a>`).join('');
}

/* ---------- FAB + menu de ações rápidas ---------- */

function openQuickMenu() {
  const actions = [
    { label: 'Registrar peso', desc: 'Balança e foto opcional', color: 'var(--p)', icon: 'scale', fn: 'openWeightSheet' },
    { label: 'Registrar refeição', desc: 'Texto, proteína e foto', color: 'var(--a)', icon: 'bowl', fn: 'openMealSheet' },
    { label: 'Registrar aplicação', desc: 'Dose e local', color: 'var(--w)', icon: 'syringe', fn: 'openInjectionSheet' },
    { label: 'Ajustar metas', desc: 'Água, proteína, peso meta', color: 'var(--ok)', icon: 'target', fn: 'openGoalsSheet' },
  ];

  openSheet({
    title: 'O que registrar?',
    hideSubmit: true,
    hideCancel: true,
    body: `
      ${actions.map((a) => `
        <button type="button" class="act" data-action="${a.fn}">
          <i style="background:${a.color}">${icon(a.icon, 22, 2)}</i>
          <div>${a.label}<span>${a.desc}</span></div>
        </button>`).join('')}`,
    onMount: (form) => {
      form.querySelectorAll('[data-action]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          closeSheet();
          const mod = await import('./forms.js');
          const fn = mod[btn.dataset.action];
          if (typeof fn === 'function') fn();
        });
      });
    },
  });
}

/* atalhos globais usados por onclick inline nos formulários */
window.openQuickMenu = openQuickMenu;
window.closeSheet = closeSheet;
window.openSheet = openSheet;

function applyTheme() {
  const t = state.settings.theme || 'auto';
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = t === 'dark' || (t === 'auto' && prefersDark);
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

async function boot() {
  document.documentElement.style.setProperty('--app-name', `"${APP.name}"`);
  await loadSettings();
  applyTheme();
  buildTabbar();
  on('settings', async (s) => {
    applyTheme();
    const { startReminders } = await import('./reminders.js');
    if (s.remindersEnabled) startReminders();
  });
  const { initReminders } = await import('./reminders.js');
  initReminders();

  const onboarded = localStorage.getItem('vitta_onboarded');
  const current = parsePath();
  const { supabase } = await import('./supabase.js');
  const { data: { session } } = await supabase.auth.getSession();
  const isLogged = !!session?.user || localStorage.getItem('vitta_user') === 'guest';

  if (!onboarded && !['onboarding','login','bemvindo'].includes(current)) {
    location.replace('#/onboarding');
    return;
  }

  if (!isLogged && !['onboarding','login'].includes(current)) {
    location.replace('#/login');
    return;
  }

  if (!state.settings.onboarded && parsePath() !== 'bemvindo') {
    location.replace('#/bemvindo');
  }

  document.querySelector('.fab')?.addEventListener('click', openQuickMenu);

  startRouter();
}

boot().catch((err) => {
  console.error(err);
  document.getElementById('view').innerHTML = `
    <div class="card" style="margin-top:40px">
      <h2 style="margin:0 0 8px">Não foi possível abrir o app</h2>
      <p class="small muted" style="margin:0 0 14px">${String(err?.message || err)}</p>
      <button class="btn btn-primary btn-block" onclick="location.reload()">Tentar de novo</button>
    </div>`;
});

/* Service worker: deixa o app disponível offline (precisa de https/localhost). */
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  let reloading = false;

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');
      watchUpdate(reg);
    } catch (err) {
      console.warn('SW falhou:', err);
    }
  });

  // Quando um novo SW assume o controle, recarrega para pegar os arquivos novos.
  // (evita misturar db.js antigo com módulos novos — caso do IndexedDB)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    const reload = () => location.reload();
    if (document.body.classList.contains('so')) {
      // não recarrega no meio de um formulário — espera a folha fechar
      const obs = new MutationObserver(() => {
        if (!document.body.classList.contains('so')) {
          obs.disconnect();
          setTimeout(reload, 150);
        }
      });
      obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
      return;
    }
    setTimeout(reload, 100);
  });

  function watchUpdate(reg) {
    if (!reg) return;
    reg.addEventListener('updatefound', () => {
      const sw = reg.installing;
      if (!sw) return;
      sw.addEventListener('statechange', () => {
        // instalado com um controller existente = nova versão disponível
        if (sw.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateToast();
        }
      });
    });
  }

  function showUpdateToast() {
    const tt = document.getElementById('tt');
    if (!tt || document.getElementById('vitta-update')) return;
    tt.innerHTML = '<button id="vitta-update" style="color:inherit;font:inherit;font-weight:700;cursor:pointer">Nova versão — toque para atualizar</button>';
    tt.classList.add('on');
    tt.querySelector('#vitta-update')?.addEventListener('click', async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      reg?.update();
      location.reload();
    });
  }
}
