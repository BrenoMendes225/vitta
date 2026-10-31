/* Tela Hoje — o painel principal com anéis de progresso. */

import { state, goals } from '../store.js';
import { icon } from '../icons.js';
import { fmtNum, fmtKg, fmtVol, esc, toast } from '../ui.js';
import * as db from '../supabase-db.js';
import { todayISO, humanDate, greeting, fmtShort, relativeDays, cap } from '../date.js';
import { weightSummary, mealTotals } from '../stats.js';
import { ringChart, sparkline } from '../charts.js';
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

  /* anéis: água (externa), proteína (média), aplicação (interna) */
  const waterPct = g.water ? Math.min(1, water / g.water) : 0;
  const proteinPct = g.protein ? Math.min(1, totals.protein / g.protein) : 0;
  const cycPct = next ? (7 - next.days) / 7 : 0;
  const overallPct = Math.round(((waterPct + proteinPct) / 2 + cycPct) * 100 / 3);

  const weightBlock = summary.latest
    ? `
      <div class="row start" style="align-items:flex-end">
        <div>
          <p class="card-label">Peso atual</p>
          <p class="big">${fmtKg(summary.latest.value)}<span class="unit">kg</span></p>
          <p class="small" style="margin:8px 0 0">
            ${summary.delta7 != null
              ? `<span class="delta ${summary.delta7 < -0.05 ? 'dn' : summary.delta7 > 0.05 ? 'up' : 'flat'}">
                   ${summary.delta7 < -0.05 ? '−' : summary.delta7 > 0.05 ? '+' : '±'} ${fmtNum(Math.abs(summary.delta7), 1)} kg
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

  const heroCard = `<section class="card hero">
        <div class="ringw">
          ${ringChart([
            { r: 88, pct: waterPct, color: 'var(--w)', label: 'Água' },
            { r: 68, pct: proteinPct, color: 'var(--p)', label: 'Proteína' },
            { r: 48, pct: cycPct, color: 'var(--a)', label: 'Aplicação' },
          ], overallPct)}
          <div class="ctr"><b>${overallPct}%</b><span>da meta de hoje</span></div>
        </div>
        <div class="lg"><i style="background:var(--w)"></i><div><b>Água</b><span>${fmtVol(water)} de ${fmtVol(g.water)} L</span></div></div>
        <div class="lg"><i style="background:var(--p)"></i><div><b>Proteína</b><span>${fmtNum(totals.protein, 0)} de ${fmtNum(g.protein, 0)} g</span></div></div>
        <div class="lg"><i style="background:var(--a)"></i><div><b>Aplicação</b><span>${next ? (next.days > 0 ? `em ${relativeDays(next.date)}` : next.days === 0 ? 'hoje' : `atrasada ${Math.abs(next.days)}d`) : 'não configurada'}</span></div></div>
      </section>`;

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
      ${heroCard}

      <section class="card">
        ${weightBlock}
        <button class="btn btn-soft btn-block" data-act="weight" style="margin-top:14px">
          ${icon('scale', 18)} ${summary.latest ? 'Pesar de novo' : 'Registrar peso'}
        </button>
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