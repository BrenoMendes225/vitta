/* Tela Mais — perfil, corpo, treino, dados e ajustes. */

import { state, APP, goals } from '../store.js';
import { icon } from '../icons.js';
import { fmtNum, fmtKg, esc } from '../ui.js';
import * as db from '../db.js';
import { ageFrom, cap } from '../date.js';
import { weightSummary } from '../stats.js';
import { go } from '../router.js';

export default async function moreScreen(view) {
  const [weights, meals, measurements, symptoms, workouts] = await Promise.all([
    db.all('weights'),
    db.count('meals'),
    db.count('measurements'),
    db.count('symptoms'),
    db.count('workouts'),
  ]);
  const summary = weightSummary(weights, state.settings);
  const g = goals();
  const name = state.settings.name || 'Você';
  const age = ageFrom(state.settings.birthDate);

  const item = (path, iconName, title, sub, end = '') => `
    <button class="list-item press" data-go="${path}">
      <span class="li-icon">${icon(iconName, 17)}</span>
      <div class="li-main">
        <div class="li-title">${esc(title)}</div>
        ${sub ? `<div class="li-sub">${esc(sub)}</div>` : ''}
      </div>
      <span class="li-end">${end}${icon('right', 15)}</span>
    </button>`;

  view.innerHTML = `
    <header class="page-head">
      <div>
        <p class="eyebrow">${cap(APP.tagline)}</p>
        <h1>Mais</h1>
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
                ${[age ? `${age} anos` : '', state.settings.height ? `${fmtNum(state.settings.height, 0)} cm` : ''].filter(Boolean).join(' · ') || 'Complete seu perfil'}
              </span>
            </div>
          </div>
          <button class="icon-btn bare" data-go="ajustes" aria-label="Editar perfil">${icon('edit', 18)}</button>
        </div>

        ${summary.latest ? `
          <div style="margin-top:14px">
            <div class="row">
              <span class="small strong">${fmtKg(summary.latest.value)} kg${summary.goalWeight ? ` <span class="muted" style="font-weight:500">de ${fmtKg(summary.goalWeight)} kg</span>` : ''}</span>
              <span class="small muted">${summary.progress != null ? `${fmtNum(summary.progress * 100, 0)}%` : ''}</span>
            </div>
            ${summary.progress != null ? `<div class="bar"><i style="width:${(summary.progress * 100).toFixed(1)}%"></i></div>` : ''}
          </div>` : ''}

        <div class="grid-3" style="margin-top:14px">
          ${[
            ['Refeições', meals],
            ['Medidas', measurements],
            ['Treinos', workouts],
          ].map(([l, v]) => `<div class="center">
            <p class="metric" style="font-size:18px;margin:0">${v}</p>
            <p class="tiny muted" style="margin:0">${l}</p>
          </div>`).join('')}
        </div>
      </section>

      <section class="card tight">
        <p class="card-label" style="padding:2px 2px 6px">Corpo</p>
        <div class="list">
          ${item('medidas', 'ruler', 'Medidas', measurements ? `${measurements} registro${measurements > 1 ? 's' : ''}` : 'cintura, quadril, braço, coxa')}
          ${item('sintomas', 'activity', 'Sintomas', symptoms ? `${symptoms} dia${symptoms > 1 ? 's' : ''} registrado${symptoms > 1 ? 's' : ''}` : 'náusea, cansaço, apetite')}
          ${item('treino', 'dumbbell', 'Treino', workouts ? `${workouts} treino${workouts > 1 ? 's' : ''}` : 'registre presença e carga')}
        </div>
      </section>

      <section class="card tight">
        <p class="card-label" style="padding:2px 2px 6px">Progresso</p>
        <div class="list">
          ${item('peso/fotos', 'photo', 'Fotos de progresso', 'compare antes e depois')}
          ${item('relatorio', 'share', 'Relatório para a consulta', 'resumo do período em PDF')}
        </div>
      </section>

      <section class="card tight">
        <p class="card-label" style="padding:2px 2px 6px">App</p>
        <div class="list">
          ${item('ajustes', 'sliders', 'Ajustes', 'metas, medicamento e IA')}
          ${item('sobre', 'info', 'Sobre o Vitta', `versão ${APP.version} · dados no seu aparelho`)}
        </div>
      </section>

      <p class="disclaimer center">${APP.name} · ${APP.tagline}</p>
    </div>`;

  view.querySelectorAll('[data-go]').forEach((el) => {
    el.addEventListener('click', () => go(el.dataset.go));
  });
}
