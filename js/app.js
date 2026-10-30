/* Bootstrap do app. */

import { loadSettings, state, APP } from './store.js';
import { startRouter, go, parsePath } from './router.js';
import { icon } from './icons.js';

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

async function boot() {
  document.documentElement.style.setProperty('--app-name', `"${APP.name}"`);
  await loadSettings();
  buildTabbar();

  if (!state.settings.onboarded && parsePath() !== 'bemvindo') {
    location.replace('#/bemvindo');
  }

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
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('SW falhou:', err));
  });
}
