/* Roteador por hash: leve, sem framework. */

const SCREENS = {
  hoje: () => import('./screens/today.js'),
  diario: () => import('./screens/meals.js'),
  peso: () => import('./screens/weight.js'),
  'peso/fotos': () => import('./screens/photos.js'),
  aplicacoes: () => import('./screens/injections.js'),
  medidas: () => import('./screens/measurements.js'),
  sintomas: () => import('./screens/symptoms.js'),
  treino: () => import('./screens/workouts.js'),
  mais: () => import('./screens/more.js'),
  ajustes: () => import('./screens/settings.js'),
  relatorio: () => import('./screens/report.js'),
  bemvindo: () => import('./screens/welcome.js'),
  sobre: () => import('./screens/about.js'),
  onboarding: () => import('./screens/onboarding.js'),
  login: () => import('./screens/login.js'),
};

const TAB_OF = {
  hoje: 'hoje',
  diario: 'diario',
  peso: 'peso',
  'peso/fotos': 'peso',
  aplicacoes: 'aplicacoes',
  medidas: 'mais',
  sintomas: 'mais',
  treino: 'mais',
  mais: 'mais',
  ajustes: 'mais',
  relatorio: 'mais',
  sobre: 'mais',
};

let currentPath = 'hoje';
let renderToken = 0;

export function parsePath() {
  const raw = location.hash.replace(/^#\/?/, '').split('?')[0];
  return raw || 'hoje';
}

export function go(path) {
  const next = `#/${path.replace(/^#?\/?/, '')}`;
  if (location.hash === next) {
    refresh();
  } else {
    location.hash = next;
  }
}

export function back(fallback = 'hoje') {
  if (history.length > 1) history.back();
  else go(fallback);
}

export function activeTab() {
  return TAB_OF[currentPath] || 'mais';
}

export function setActiveTab() {
  const tab = activeTab();
  document.querySelectorAll('#tabbar a').forEach((a) => {
    a.classList.toggle('on', a.dataset.tab === tab);
  });
}

async function renderError(view, err) {
  console.error(err);
  view.innerHTML = `<div class="card" style="margin-top:24px">
    <h2 style="margin:0 0 6px;font-size:18px">Algo saiu do lugar</h2>
    <p class="small muted" style="margin:0 0 14px">${String(err?.message || err)}</p>
    <button class="btn btn-primary btn-block" data-reload>Recarregar</button>
  </div>`;
  view.querySelector('[data-reload]')?.addEventListener('click', () => location.reload());
}

export async function render({ keepScroll = false } = {}) {
  const view = document.getElementById('view');
  const path = parsePath();
  const token = ++renderToken;
  const scrollY = window.scrollY;

  const loader = SCREENS[path] || SCREENS.hoje;
  currentPath = SCREENS[path] ? path : 'hoje';

  try {
    const mod = await loader();
    if (token !== renderToken) return;
    view.innerHTML = '';
    await mod.default(view, { path, params: path.split('/').slice(1) });
    if (token !== renderToken) return;
    if (keepScroll) window.scrollTo(0, scrollY);
    else window.scrollTo(0, 0);
  } catch (err) {
    if (token === renderToken) renderError(view, err);
  }
  setActiveTab();
  document.body.dataset.route = currentPath;
}

export function refresh(options = {}) {
  return render({ ...options });
}

export function startRouter() {
  window.addEventListener('hashchange', () => render());
  render();
}
