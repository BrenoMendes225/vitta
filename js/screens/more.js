/* Tela Mais — perfil, registros, progresso e ajustes. */
import { state, APP, goals } from '../store.js';
import { icon } from '../icons.js';
import { fmtNum, fmtWeight, weightUnitLabel, fmtHeight, heightUnitLabel, esc, openSheet, confirmSheet, toast } from '../ui.js';
import * as db from '../supabase-db.js';
import { ageFrom, cap, todayISO, startOfWeek, addDays } from '../date.js';
import { weightSummary, streak } from '../stats.js';
import { go } from '../router.js';

const PHRASES = [
  'Constância, não perfeição',
  'Pequenos passos, grandes mudanças',
  'Cuidado diário vence pressa',
  'Hoje é um bom dia para começar',
  'Seu corpo agradece a escuta',
  'Progresso é soma de escolhas',
  'Gentileza consigo é cuidado',
  'Foco no processo, não no resultado',
  'Cada dia é um novo começo',
  'Acolha o ritmo do seu corpo',
];

function dayPhrase() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const dayOfYear = Math.floor(diff / 86400000);
  return PHRASES[dayOfYear % PHRASES.length];
}

export default async function moreScreen(view) {
  const [weights, mealsAll, measurementsAll, workoutsAll, symptomsAll, injectionsAll] = await Promise.all([
    db.all('weights'),
    db.all('meals'),
    db.all('measurements'),
    db.all('workouts'),
    db.all('symptoms'),
    db.all('injections'),
  ]);

  const weekStart = startOfWeek(todayISO());
  const weekEnd = todayISO();

  const [mealsWeek, measurementsWeek, workoutsWeek] = await Promise.all([
    db.inRange('meals', weekStart, weekEnd),
    db.inRange('measurements', weekStart, weekEnd),
    db.inRange('workouts', weekStart, weekEnd),
  ]);

  // Profile & weight
  const sortedWeights = [...weights].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const firstW = sortedWeights.find(w => Number.isFinite(Number(w.kg)));
  const latestW = sortedWeights[sortedWeights.length - 1];
  const goalWeight = Number(state.settings.goalWeight) || null;

  let progressText = '';
  let progressValue = null;
  if (latestW && firstW && goalWeight && firstW.kg !== goalWeight) {
    const firstKg = Number(firstW.kg);
    const lastKg = Number(latestW.kg);
    const prog = (firstKg - lastKg) / (firstKg - goalWeight);
    progressValue = Math.max(0, Math.min(1, prog));
    const remaining = lastKg - goalWeight;
    progressText = `Início ${fmtWeight(firstKg)} ${weightUnitLabel()} → Agora ${fmtWeight(lastKg)} ${weightUnitLabel()} → Meta ${fmtWeight(goalWeight)} ${weightUnitLabel()} · faltam ${fmtWeight(remaining)} ${weightUnitLabel()}`;
  } else if (weights.length > 0) {
    const lastKg = Number(latestW?.kg);
    progressText = `Agora ${fmtWeight(lastKg)} ${weightUnitLabel()}${goalWeight ? ` · meta ${fmtWeight(goalWeight)} ${weightUnitLabel()}` : ''}`;
  }

  // Streak
  const datesSet = new Set();
  const addDates = arr => arr.forEach(r => r.date && datesSet.add(r.date));
  addDates(weights);
  addDates(mealsAll);
  addDates(workoutsAll);
  addDates(symptomsAll);
  addDates(injectionsAll);
  const streakDays = streak(Array.from(datesSet), todayISO());
  const streakLabel = streakDays > 0 ? `🔥 ${streakDays} dias seguidos` : '';

  const name = state.settings.name || 'Você';
  const age = ageFrom(state.settings.birthDate);

  const item = (path, iconName, title, sub, end = '', colorClass = '') => `
    <button class="list-item press" data-go="${path}">
      <span class="li-icon ${colorClass}">${icon(iconName, 17)}</span>
      <div class="li-main">
        <div class="li-title">${esc(title)}</div>
        ${sub ? `<div class="li-sub">${esc(sub)}</div>` : ''}
      </div>
      <span class="li-end">${end}${icon('right', 15)}</span>
    </button>`;

  const metrics = [
    ['Refeições', mealsWeek.length, mealsWeek.length ? '' : 'Vamos começar a semana?'],
    ['Medidas', measurementsWeek.length, measurementsWeek.length ? '' : 'Registre uma medida hoje'],
    ['Treinos', workoutsWeek.length, workoutsWeek.length ? '' : 'Movimente-se com carinho'],
  ];

  const measurementsCount = measurementsAll.length;
  const symptomsCount = symptomsAll.length;
  const workoutsCount = workoutsAll.length;

  view.innerHTML = `
    <header class="page-head">
      <div>
      </div>
    </header>

    <div class="stack">
      <section class="card">
        <div class="row start">
          <div class="row" style="gap:12px;justify-content:flex-start">
            <span class="avatar" style="width:46px;height:46px;font-size:17px">${esc(name[0].toUpperCase())}</span>
            <div class="stack-sm">
              <span class="strong" style="font-size:16px">${esc(name)}</span>
              <span class="small muted">
                ${[age ? `${age} anos` : '', state.settings.height ? `${fmtHeight(state.settings.height)} ${heightUnitLabel()}` : ''].filter(Boolean).join(' · ') || 'Complete seu perfil'}
              </span>
            </div>
          </div>
          <button class="icon-btn bare" data-go="ajustes" aria-label="Editar perfil">${icon('edit', 18)}</button>
        </div>

        <div style="margin-top:14px">
          ${progressText || streakLabel ? `
          <div class="row">
            ${progressText ? `<span class="small strong">${progressText}</span>` : ''}
            ${streakLabel ? `<span class="small muted">${streakLabel}</span>` : ''}
          </div>` : ''}
          ${progressValue != null ? `<div class="bar"><i style="width:${(progressValue * 100).toFixed(1)}%"></i></div>` : ``}
        </div>

        <div class="grid-3" style="margin-top:14px">
          ${metrics.map(([l, v, hint]) => `
            <div class="center">
              <p class="metric" style="font-size:18px;margin:0">${v > 0 ? v : ''}</p>
            </div>
          `).join('')}
        </div>
      </section>

      <section class="card tight">
        <p class="card-label" style="padding:2px 2px 6px">Registros</p>
        <div class="list">
          ${item('medidas', 'ruler', 'Medidas', measurementsCount ? `${measurementsCount} registro${measurementsCount > 1 ? 's' : ''}` : 'cintura, quadril, braço, coxa')}
          ${item('sintomas', 'activity', 'Sintomas', symptomsCount ? `${symptomsCount} dia${symptomsCount > 1 ? 's' : ''} registrado${symptomsCount > 1 ? 's' : ''}` : 'náusea, cansaço, apetite')}
          ${item('treino', 'dumbbell', 'Treino', workoutsCount ? `${workoutsCount} treino${workoutsCount > 1 ? 's' : ''}` : 'registre presença e carga')}
        </div>
      </section>

      <section class="card tight">
        <p class="card-label" style="padding:2px 2px 6px">Progresso</p>
        <div class="list">
          ${item('peso/fotos', 'photo', 'Fotos de progresso', 'compare antes e depois')}
          ${item('relatorio', 'share', 'Relatório para a consulta', 'resumo do período em PDF')}
        </div>
      </section>

      <section class="card gentle" style="padding:18px">
        <p class="card-label" style="padding:0 0 6px">Gentileza</p>
        <div style="font-size:14px;line-height:1.55;color:var(--ink)">
          <div style="font-weight:700;margin-bottom:6px">Cuidado constante vale mais que perfeição</div>
          <div class="small muted">Se foi um dia difícil, tudo bem. Continue com gentileza consigo. A sequência não se quebra por autocuidado.</div>
        </div>
      </section>

      <section class="card tight">
        <p class="card-label" style="padding:2px 2px 6px">App</p>
        <div class="list">
          ${item('ajustes', 'sliders', 'Ajustes', 'metas, medicamento e IA')}
          ${item('backup', 'download', 'Backup', 'exportar e importar seus dados')}
          ${item('ajustes', 'bell', 'Lembretes', 'em breve')}
          ${item('ajustes', 'palette', 'Tema e unidades', 'em breve')}
        </div>
      </section>

      <p class="disclaimer center">Vitta v0.1.0 · dados no seu aparelho</p>
    </div>`;

  view.querySelectorAll('[data-go]').forEach((el) => {
    const path = el.dataset.go;
    if (path === 'backup') {
      el.addEventListener('click', () => openBackupSheet());
    } else {
      el.addEventListener('click', () => go(path));
    }
  });
}

/* Backup sheet */
async function openBackupSheet() {
  openSheet({
    title: 'Backup',
    hideSubmit: true,
    hideCancel: true,
    body: `
      <p class="small muted" style="margin:0 0 12px">Exporte seus dados para um arquivo JSON e importe quando quiser. Fotos não são incluídas.</p>
      <button class="btn btn-primary btn-block" id="btn-export">Exportar JSON</button>
      <div class="field span-2" style="margin-top:12px">
        <label>Importar JSON</label>
        <input type="file" id="import-file" accept="application/json">
        <span class="hint">A importação acrescenta registros aos existentes.</span>
      </div>
    `,
    onMount: (form) => {
      form.querySelector('#btn-export')?.addEventListener('click', async () => {
        try {
          const data = await db.exportAll();
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `vitta-backup-${new Date().toISOString().slice(0,10)}.json`;
          a.click();
          URL.revokeObjectURL(url);
          toast('Backup exportado');
        } catch (e) {
          toast('Não foi possível exportar');
          console.error(e);
        }
      });

      form.querySelector('#import-file')?.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          const ok = await confirmSheet({
            title: 'Importar backup',
            message: 'Deseja importar os dados? Os registros serão adicionados aos atuais.',
            confirmLabel: 'Importar',
          });
          if (!ok) return;
          const total = await db.importAll(data, { replace: false });
          toast(`Importados ${total} registros`);
        } catch (err) {
          toast('Arquivo inválido');
          console.error(err);
        }
      });
    }
  });
}
