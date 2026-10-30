/* Bootstrap do app. */

import { loadSettings, state, APP } from './store.js';
import { startRouter, go, parsePath } from './router.js';
import { icon } from './icons.js';
import { toast } from './ui.js';

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
  
  // marca tab ativa
  const cur = parsePath();
  nav.querySelectorAll('a').forEach(a => {
    if (a.getAttribute('href') === `#/${cur}`) a.classList.add('on');
  });
}

/* ---------- FAB + Menu de ações rápidas ---------- */

function openQuickMenu() {
  const actions = [
    { label: 'Registrar peso', desc: 'Balança e foto opcional', color: 'var(--p)', icon: 'scale', fn: 'openWeightSheet()' },
    { label: 'Registrar refeição', desc: 'Texto, proteína e foto', color: 'var(--a)', icon: 'bowl', fn: 'openMealSheet()' },
    { label: 'Registrar aplicação', desc: 'Dose e local', color: 'var(--w)', icon: 'syringe', fn: 'openInjectionSheet()' },
    { label: 'Ajustar metas', desc: 'Água, proteína, peso meta', color: 'var(--ok)', icon: 'target', fn: 'openGoalsSheet()' },
  ];
  
  const html = `
    <div class="sheet-head"><h2>O que registrar?</h2></div>
    <div class="sheet-body">
      ${actions.map(a => `
        <button class="act" onclick="${a.fn}; closeSheet()">
          <i style="background:${a.color}">${icon(a.icon, 22, 2)}</i>
          <div>${a.label}<span>${a.desc}</span></div>
        </button>`).join('')}
    </div>`;
  
  openSheet(html);
}

// Funções globais para onclick inline nos screens
window.openQuickMenu = openQuickMenu;
window.closeSheet = () => document.body.classList.remove('so');
window.openSheet = (html) => {
  document.getElementById('sh').innerHTML = '<div class="grab"></div>' + html;
  document.body.classList.add('so');
};

// Delegação para sheets que precisam chamar funções dos screens
window.openWeightSheet = () => import('./forms.js').then(m => m.openWeightSheet());
window.openMealSheet = () => import('./forms.js').then(m => m.openMealSheet());
window.openInjectionSheet = () => import('./forms.js').then(m => m.openInjectionSheet());
window.openGoalsSheet = () => import('./forms.js').then(m => m.openGoalsSheet());

async function boot() {
  document.documentElement.style.setProperty('--app-name', `"${APP.name}"`);
  await loadSettings();
  buildTabbar();

  if (!state.settings.onboarded && parsePath() !== 'bemvindo') {
    location.replace('#/bemvindo');
  }

  // FAB click
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
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('SW falhou:', err));
  });
}