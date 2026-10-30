/* Tela Hoje — o painel principal. */

import { state, goals } from '../store.js';
import { icon } from '../icons.js';
import { fmtNum, fmtKg, fmtVol, progressBar, esc, toast } from '../ui.js';
import * as db from '../db.js';
import { todayISO, humanDate, greeting, fmtShort, relativeDays, cap } from '../date.js';
import { weightSummary, mealTotals } from '../stats.js';
import { sparkline } from '../charts.js';
import { getWater, addWater } from '../water.js';
import { nextInjection, doseLabel } from '../schedule.js';
import { weightSheet, waterSheet, mealSheet, injectionSheet, symptomSheet } from '../forms.js';
import { refresh, go } from '../router.js';

export default async function todayScreen(view) {
  const today = todayISO();
  const [weights, meals, injections, water, symptoms] = await Promise.all([
    db.all('weights'),
    db.byDate('meals', today),
    db.all('injections'),
    getWater(today),
    db.byDate('symptoms', today),
  ]);

  const g = goals();
  const summary = weightSummary(weights, state.settings);
  const totals = mealTotals(meals);
  const next = nextInjection(state.settings, injections);
  const firstName = (state.settings.name || '').trim().split(' ')[0];
  const spark = summary.daily.slice(-14).map((p) => ({ date: p.date, value: p.value }));

  const weightBlock = summary.latest
    ? `
      <div class="row start" style="align-items:flex-end">
        <div>
          <p class="card-label">Peso atual</p>
          <p class="big">${fmtKg(summary.latest.value)}<span class="unit">kg</span></p>
          <p class="small" style="margin:8px 0 0">
            ${summary.delta7 != null
              ? `<span class="delta ${summary.delta7 < -0.05 ? 'down' : summary.delta7 > 0.05 ? 'up' : 'flat'}">
                   ${summary.delta7 < -0.05 ? '↓' : summary.delta7 > 0.05 ? '↑' : '→'} ${fmtNum(Math.abs(summary.delta7), 1)} kg
                 </span> <span class="muted">na média de 7 dias</span>`
              : '<span class="muted">primeiro registro</span>'}
          </p>
        </div>
        <div style="margin-bottom:2px">${sparkline(spark, { width: 96, height: 42 })}</div>
      </div>`
    : `
      <p class="card-label">Peso</p>
      <p class="big muted" style="font-size:26px">sem registros</p>
      <p class="small muted" style="margin:8px 0 0">Comece pesando hoje de manhã, em jejum.</p>`;

  const waterPct = g.water ? Math.min(100, (water / g.water) * 100) : 0;
  const proteinRemaining = Math.max(0, g.protein - totals.protein);

  const injectionBlock = next
    ? `<div class="row">
        <div class="stack-sm">
          <div class="row" style="justify-content:flex-start;gap:8px">
            <span class="metric">${fmtShort(next.date)}</span>
            <span class="chip ${next.days < 0 ? 'danger' : next.days === 0 ? 'amber' : 'accent'}">
              ${next.days < 0 ? `atrasada ${Math.abs(next.days)}d` : relativeDays(next.date)}
            </span>
          </div>
          <p class="small muted" style="margin:0">
            ${[doseLabel(state.settings.injection, next.dose), next.site].filter(Boolean).join(' · ') || 'Sem dose definida'}
          </p>
        </div>
        <button class="btn btn-sm ${next.days <= 0 ? 'btn-primary' : 'btn-soft'}" data-act="injection">Registrar</button>
      </div>`
    : `<p class="small muted" style="margin:0 0 12px">Defina o medicamento e o intervalo para o app calcular a próxima aplicação e o rodízio de local.</p>
       <button class="btn btn-soft btn-block" data-go="ajustes">Configurar</button>`;

  view.innerHTML = `
    <header class="page-head">
      <div>
        <p class="eyebrow">${cap(humanDate(today))}</p>
        <h1>${esc(greeting())}${firstName ? `, ${esc(firstName)}` : ''}</h1>
        <p class="subhead">${summary.total != null && summary.total < -0.05
          ? `Você já está ${fmtNum(Math.abs(summary.total), 1)} kg abaixo do início.`
          : state.settings.goalWeight && summary.latest
            ? `Faltam ${fmtNum(Math.max(0, summary.latest.value - state.settings.goalWeight), 1)} kg para a meta.`
            : 'Um dia de cada vez.'}</p>
      </div>
      <button class="avatar" data-go="ajustes" aria-label="Ajustes">${esc((firstName || 'V')[0].toUpperCase())}</button>
    </header>

    <div class="stack">
      <section class="card">
        ${weightBlock}
        <button class="btn btn-soft btn-block" data-act="weight" style="margin-top:14px">
          ${icon('scale', 18)} ${summary.latest ? 'Pesar de novo' : 'Registrar peso'}
        </button>
      </section>

      <div class="grid-2">
        <section class="card tight">
          <div class="row">
            <p class="card-label">Água</p>
            <span style="color:var(--water)">${icon('drop', 16)}</span>
          </div>
          <p class="metric">${fmtVol(water)} <span class="tiny muted">/ ${fmtVol(g.water)} L</span></p>
          ${progressBar(water, g.water, 'water')}
          <div class="row" style="margin-top:10px;gap:6px">
            <button class="btn btn-sm btn-soft water" data-water="250" style="flex:1">+250</button>
            <button class="btn btn-sm btn-soft water" data-water="500" style="flex:1">+500</button>
          </div>
          <p class="tiny muted" style="margin:8px 0 0">${water >= g.water ? 'meta batida ✓' : `${fmtVol(g.water - water)} L restantes`}</p>
        </section>

        <section class="card tight">
          <div class="row">
            <p class="card-label">Proteína</p>
            <span style="color:var(--protein)">${icon('activity', 16)}</span>
          </div>
          <p class="metric">${fmtNum(totals.protein, 0)} <span class="tiny muted">/ ${fmtNum(g.protein, 0)} g</span></p>
          ${progressBar(totals.protein, g.protein, 'protein')}
          <p class="tiny" style="margin:10px 0 0;color:${proteinRemaining > 0 ? 'var(--protein)' : 'var(--accent)'};font-weight:650">
            ${g.protein ? (proteinRemaining > 0 ? `faltam ${fmtNum(proteinRemaining, 0)} g` : 'meta batida ✓') : 'defina a meta'}
          </p>
          <p class="tiny muted" style="margin:3px 0 0">${meals.length} refeiç${meals.length === 1 ? 'ão' : 'ões'} hoje</p>
        </section>
      </div>

      <section class="card">
        <p class="card-title">${icon('syringe', 16)} Aplicação</p>
        ${injectionBlock}
      </section>

      <div class="quick-grid">
        <button class="quick" data-act="weight">${icon('scale', 21)}Pesar</button>
        <button class="quick" data-act="meal">${icon('bowl', 21)}Refeição</button>
        <button class="quick" data-act="water">${icon('drop', 21)}Água</button>
        <button class="quick" data-act="symptom">${icon('activity', 21)}Sintomas</button>
      </div>

      ${symptoms.length ? '' : `
      <button class="card flat" data-act="symptom" style="text-align:left;border:0;width:100%">
        <div class="row">
          <div class="stack-sm">
            <span class="strong" style="font-size:14.5px">Como você está hoje?</span>
            <span class="small muted">2 minutos para registrar sintomas</span>
          </div>
          ${icon('right', 18)}
        </div>
      </button>`}

      <p class="disclaimer">
        O Vitta não substitui médico ou nutricionista. As estimativas da IA são aproximadas e servem para acompanhar tendências.
      </p>
    </div>`;

  view.querySelectorAll('[data-go]').forEach((el) => {
    el.addEventListener('click', () => go(el.dataset.go));
  });

  view.querySelectorAll('[data-act]').forEach((el) => {
    el.addEventListener('click', () => {
      const act = el.dataset.act;
      if (act === 'weight') return weightSheet({ onDone: refresh });
      if (act === 'water') return waterSheet({ current: water, onDone: refresh });
      if (act === 'meal') return mealSheet({ onDone: refresh });
      if (act === 'injection') return injectionSheet({ onDone: refresh });
      if (act === 'symptom') return symptomSheet({ onDone: refresh });
    });
  });

  view.querySelectorAll('[data-water]').forEach((el) => {
    el.addEventListener('click', async () => {
      const ml = Number(el.dataset.water);
      const total = await addWater(ml, today);
      refresh({ keepScroll: true });
      toast(`+${ml} ml · ${fmtVol(total)} L`);
    });
  });
}
