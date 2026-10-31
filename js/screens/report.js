/* Relatório para a consulta — resumo do período e impressão/PDF. */

import { state, APP } from '../store.js';
import { icon } from '../icons.js';
import { fmtNum, fmtKg, signed, esc, fmtL } from '../ui.js';
import * as db from '../supabase-db.js';
import { todayISO, addDays, fmtShort, fmtLong, rangeDays, humanDate, fmtMonthYear } from '../date.js';
import { dailyWeights, mealTotals, sortAsc } from '../stats.js';
import { getWater } from '../water.js';
import { back } from '../router.js';

const PERIODS = [
  { value: '30', label: '30 dias' },
  { value: '90', label: '90 dias' },
  { value: '180', label: '6 meses' },
  { value: 'all', label: 'Tudo' },
];

let period = '30';

export default async function reportScreen(view) {
  const today = todayISO();
  const days = period === 'all' ? null : Number(period);
  const from = days ? addDays(today, -(days - 1)) : null;

  const [weights, meals, measurements, injections, symptoms, workouts] = await Promise.all([
    db.all('weights'), db.all('meals'), db.all('measurements'),
    db.all('injections'), db.all('symptoms'), db.all('workouts'),
  ]);

  const within = (r) => !from || (r.date && r.date >= from);
  const w = sortAsc(weights.filter(within));
  const daily = dailyWeights(w);
  const first = daily[0] || null;
  const last = daily[daily.length - 1] || null;
  const delta = first && last ? last.value - first.value : null;

  const milk = meals.filter(within);
  const mealByDay = new Map();
  for (const m of milk) mealByDay.set(m.date, [...(mealByDay.get(m.date) || []), m]);
  const dayTotals = [...mealByDay.values()].map(mealTotals);
  const avgKcal = dayTotals.length ? dayTotals.reduce((a, t) => a + t.kcal, 0) / dayTotals.length : null;
  const avgProtein = dayTotals.length ? dayTotals.reduce((a, t) => a + t.protein, 0) / dayTotals.length : null;

  const mRows = sortAsc(measurements.filter(within));
  const mFirst = mRows[0] || null;
  const mLast = mRows[mRows.length - 1] || null;

  const inj = injections.filter(within);
  const symp = symptoms.filter(within);
  const avgSym = (key) => (symp.length ? symp.reduce((a, s) => a + (Number(s[key]) || 0), 0) / symp.length : null);

  const waterDays = rangeDays(from || (w[0]?.date || today), today);
  const waters = await Promise.all(waterDays.map((d) => getWater(d)));
  const waterAvg = waters.length ? waters.reduce((a, b) => a + b, 0) / waters.length : 0;

  const streakDays = new Set(milk.map((m) => m.date)).size;
  const workoutDays = new Set(workouts.filter(within).map((x) => x.date)).size;

  const metricRow = (label, a, b, unit = 'cm') => {
    if (!a && !b) return '';
    const d = a != null && b != null ? b - a : null;
    return `<tr>
      <td>${label}</td>
      <td>${a != null ? fmtNum(a, 1) : '—'} ${unit}</td>
      <td>${b != null ? fmtNum(b, 1) : '—'} ${unit}</td>
      <td class="${d != null && d < 0 ? 'good' : ''}">${d != null ? `${signed(d, 1)} ${unit}` : '—'}</td>
    </tr>`;
  };

  view.innerHTML = `
    <header class="page-head no-print">
      <div style="display:flex;align-items:center;gap:10px">
        <button class="icon-btn bare" data-back aria-label="Voltar">${icon('left', 20)}</button>
        <div>
          <p class="eyebrow">Consulta</p>
          <h1>Relatório</h1>
        </div>
      </div>
      <button class="btn btn-sm btn-primary" data-print>${icon('share', 15)} PDF</button>
    </header>

    <div class="no-print" style="margin:-6px 0 14px">
      <div class="chips" data-period>
        ${PERIODS.map((p) => `<button type="button" class="chip${period === p.value ? ' on' : ''}" onclick="setPeriod('${p.value}')">${p.label}</button>`).join('')}
      </div>
    </div>

    <article class="report">
      <div class="report-head">
        <div>
          <p class="eyebrow" style="margin:0">${APP.name}</p>
          <h2 style="margin:2px 0 0;font-size:22px">Resumo de acompanhamento</h2>
          <p class="small muted" style="margin:4px 0 0">
            ${esc(state.settings.name || 'Paciente')} ·
            ${from ? `${fmtShort(from)} a ${fmtShort(today)}` : 'histórico completo'} · emitido em ${fmtShort(today)}
          </p>
        </div>
      </div>

      <section class="report-section">
        <h3>Peso</h3>
        <table class="report-table">
          <tr><td>Peso inicial do período</td><td>${first ? `${fmtKg(first.value)} kg` : '—'}</td></tr>
          <tr><td>Peso atual</td><td>${last ? `${fmtKg(last.value)} kg` : '—'}</td></tr>
          <tr><td>Variação</td><td class="${delta != null && delta < 0 ? 'good' : ''}">${delta != null ? `${signed(delta)} kg` : '—'}</td></tr>
          ${state.settings.goalWeight ? `<tr><td>Meta</td><td>${fmtKg(state.settings.goalWeight)} kg</td></tr>` : ''}
          <tr><td>Registros de peso</td><td>${daily.length} dia${daily.length === 1 ? '' : 's'}</td></tr>
        </table>
      </section>

      ${(mFirst || mLast) ? `<section class="report-section">
        <h3>Medidas</h3>
        <table class="report-table">
          <thead><tr><th>Medida</th><th>Início</th><th>Atual</th><th>Variação</th></tr></thead>
          <tbody>
            ${metricRow('Cintura', mFirst?.waist, mLast?.waist)}
            ${metricRow('Quadril', mFirst?.hip, mLast?.hip)}
            ${metricRow('Braço', mFirst?.arm, mLast?.arm)}
            ${metricRow('Coxa', mFirst?.thigh, mLast?.thigh)}
            ${metricRow('Peito', mFirst?.chest, mLast?.chest)}
          </tbody>
        </table>
      </section>` : ''}

      <section class="report-section">
        <h3>Alimentação</h3>
        <table class="report-table">
          <tr><td>Dias com registro</td><td>${streakDays}</td></tr>
          <tr><td>Média de calorias por dia registrado</td><td>${avgKcal != null ? `${fmtNum(avgKcal, 0)} kcal` : '—'}</td></tr>
          <tr><td>Média de proteína por dia registrado</td><td>${avgProtein != null ? `${fmtNum(avgProtein, 0)} g` : '—'}</td></tr>
        </table>
      </section>

      <section class="report-section">
        <h3>Tratamento e rotina</h3>
        <table class="report-table">
          <tr><td>Aplicações registradas</td><td>${inj.length}</td></tr>
          ${state.settings.injection?.name ? `<tr><td>Medicamento</td><td>${esc(state.settings.injection.name)}${state.settings.injection.dose ? ` · ${esc(state.settings.injection.dose)} ${esc(state.settings.injection.unit || '')}` : ''}</td></tr>` : ''}
          <tr><td>Dias com treino</td><td>${workoutDays}</td></tr>
          <tr><td>Média de água por dia</td><td>${fmtL(waterAvg)} L</td></tr>
        </table>
      </section>

      ${symp.length ? `<section class="report-section">
        <h3>Sintomas (média do período, escala 0–5)</h3>
        <table class="report-table">
          <tr><td>Náusea</td><td>${avgSym('nausea') != null ? fmtNum(avgSym('nausea'), 1) : '—'}</td></tr>
          <tr><td>Prisão de ventre</td><td>${avgSym('constipation') != null ? fmtNum(avgSym('constipation'), 1) : '—'}</td></tr>
          <tr><td>Cansaço</td><td>${avgSym('fatigue') != null ? fmtNum(avgSym('fatigue'), 1) : '—'}</td></tr>
          <tr><td>Apetite</td><td>${avgSym('appetite') != null ? fmtNum(avgSym('appetite'), 1) : '—'}</td></tr>
        </table>
        <p class="tiny muted" style="margin:8px 0 0">${symp.length} dia${symp.length === 1 ? '' : 's'} com check-in.</p>
      </section>` : ''}

      <p class="report-foot">
        Dados autorregistrados no app ${APP.name}. Estimativas de calorias e macros são aproximadas.
        Este documento não substitui avaliação clínica.
      </p>
    </article>`;

  view.querySelector('[data-back]')?.addEventListener('click', () => back('mais'));
  view.querySelector('[data-print]')?.addEventListener('click', () => window.print());

  // period pills - delegado no window
  window.setPeriod = (v) => {
    period = v;
    import('../router.js').then(({ refresh }) => refresh({ keepScroll: true }));
  };
}