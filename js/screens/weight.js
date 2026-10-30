/* Tela Peso — gráfico com média móvel, histórico e medidas corporais. */

import { state, goals } from '../store.js';
import { icon } from '../icons.js';
import { fmtNum, fmtKg, signed, esc, emptyState } from '../ui.js';
import * as db from '../db.js';
import { todayISO, addDays, humanDate, fmtMonthYear, diffDays } from '../date.js';
import { weightSummary, movingAverage, sortAsc } from '../stats.js';
import { lineChart } from '../charts.js';
import { weightSheet } from '../forms.js';
import { refresh, go } from '../router.js';

let range = '30';

function bmiLabel(bmi) {
  if (!bmi) return '';
  if (bmi < 18.5) return 'abaixo do adequado';
  if (bmi < 25) return 'faixa adequada';
  if (bmi < 30) return 'acima do adequado';
  return 'faixa de obesidade';
}

export default async function weightScreen(view) {
  const today = todayISO();
  const [weights, photos] = await Promise.all([db.all('weights'), db.all('photos')]);
  const summary = weightSummary(weights, state.settings);
  const g = goals();
  const withMa = movingAverage(summary.daily, 7);

  const cutoff = range === 'all' ? null : addDays(today, -(Number(range) - 1));
  const points = withMa.filter((p) => !cutoff || p.date >= cutoff);

  const bmi = state.settings.height && summary.latest
    ? summary.latest.value / Math.pow(Number(state.settings.height) / 100, 2)
    : null;

  const rangeSeg = `
    <div class="seg" data-range style="width:190px">
      ${[['30', '30d'], ['90', '90d'], ['all', 'tudo']].map(([v, l]) => `
        <button type="button" data-value="${v}" class="${range === v ? 'on' : ''}">${l}</button>`).join('')}
    </div>`;

  const chartCard = points.length
    ? `<section class="card">
        <div class="row" style="margin-bottom:4px">
          <p class="card-title" style="margin:0">Evolução</p>
          ${rangeSeg}
        </div>
        <div class="row" style="align-items:flex-end;margin:10px 0 0">
          <div>
            <p class="card-label" style="margin:0">Média de 7 dias</p>
            <p class="metric" style="font-size:26px">${fmtKg(summary.maNow)} <span class="tiny muted">kg</span></p>
          </div>
          <div style="text-align:right">
            <p class="small" style="margin:0">
              ${summary.delta7 != null
                ? `<span class="delta ${summary.delta7 < -0.05 ? 'down' : 'flat'}">${signed(summary.delta7)} kg</span>`
                : '<span class="muted">—</span>'}
            </p>
            <p class="tiny muted" style="margin:2px 0 0">vs. semana anterior</p>
          </div>
        </div>
        ${lineChart({ points, goal: summary.goalWeight, height: 200 })}
        <div class="row" style="margin-top:6px">
          <span class="tiny muted">linha cheia = média de 7 dias · pontos = registros</span>
        </div>
      </section>`
    : `<section class="card">${emptyState(
      'Nenhum peso registrado ainda.<br>Pese-se ao acordar, em jejum, e registre aqui.',
      `<button class="btn btn-primary" data-add>Registrar peso</button>`,
    )}</section>`;

  const statsCard = summary.latest
    ? `<div class="grid-3">
        <div class="card tight center">
          <p class="card-label" style="font-size:10.5px">Total</p>
          <p class="metric" style="font-size:17px">${summary.total != null ? `${signed(summary.total)} kg` : '—'}</p>
        </div>
        <div class="card tight center">
          <p class="card-label" style="font-size:10.5px">Para a meta</p>
          <p class="metric" style="font-size:17px">${summary.remaining != null ? `${fmtNum(Math.max(0, summary.remaining), 1)} kg` : '—'}</p>
        </div>
        <div class="card tight center">
          <p class="card-label" style="font-size:10.5px">IMC</p>
          <p class="metric" style="font-size:17px">${bmi ? fmtNum(bmi, 1) : '—'}</p>
        </div>
      </div>
      ${summary.progress != null ? `<section class="card tight">
        <div class="row"><span class="small strong">Progresso até a meta</span><span class="small muted">${fmtNum(summary.progress * 100, 0)}%</span></div>
        ${`<div class="bar"><i style="width:${(summary.progress * 100).toFixed(1)}%"></i></div>`}
        <p class="tiny muted" style="margin:8px 0 0">${fmtKg(summary.startWeight)} kg → ${fmtKg(summary.goalWeight)} kg${bmi ? ` · IMC ${fmtNum(bmi, 1)} (${bmiLabel(bmi)})` : ''}</p>
      </section>` : ''}`
    : '';

  const sortedDesc = sortAsc(weights).reverse();
  const groups = new Map();
  for (const row of sortedDesc) {
    const key = row.date.slice(0, 7);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const history = sortedDesc.length
    ? [...groups.entries()].map(([key, rows]) => {
      const first = rows[0].date;
      return `<section class="card tight">
        <p class="card-label" style="margin-bottom:2px">${fmtMonthYear(first)}</p>
        <div class="list">
          ${rows.map((r) => {
            const prev = sortAsc(weights).filter((x) => x.date < r.date).pop();
            const delta = prev ? Number(r.kg) - Number(prev.kg) : null;
            return `<button class="list-item press" data-edit="${r.id}">
              <div class="li-main">
                <div class="li-title">${fmtKg(r.kg)} kg ${r.photoId ? `<span class="muted" style="font-weight:400">· foto</span>` : ''}</div>
                <div class="li-sub">${humanDate(r.date)}${r.note ? ` · ${esc(r.note)}` : ''}</div>
              </div>
              <div class="li-end">${delta != null ? `<span class="delta ${delta < -0.05 ? 'down' : delta > 0.05 ? 'up' : 'flat'}">${signed(delta)}</span>` : ''}</div>
            </button>`;
          }).join('')}
        </div>
      </section>`;
    }).join('')
    : '';

  view.innerHTML = `
    <header class="page-head">
      <div>
        <p class="eyebrow">Acompanhamento</p>
        <h1>Peso</h1>
        <p class="subhead">A média de 7 dias mostra a tendência real — o peso do dia oscila.</p>
      </div>
      <button class="icon-btn" data-add aria-label="Registrar peso">${icon('plus', 20)}</button>
    </header>

    <div class="stack">
      ${chartCard}
      ${statsCard}

      <div class="row" style="padding:4px 2px 0">
        <span class="small strong muted" style="letter-spacing:.03em;text-transform:uppercase;font-size:11px">Histórico</span>
        <button class="btn btn-sm btn-soft" data-photos>${icon('photo', 15)} Fotos${photos.length ? ` (${photos.length})` : ''}</button>
      </div>
      ${history || emptyState('Seus registros aparecem aqui.')}
    </div>`;

  view.querySelector('[data-add]')?.addEventListener('click', () => weightSheet({ onDone: refresh }));
  view.querySelector('[data-photos]')?.addEventListener('click', () => go('peso/fotos'));

  view.querySelectorAll('[data-range] button').forEach((btn) => {
    btn.addEventListener('click', () => {
      range = btn.dataset.value;
      view.querySelectorAll('[data-range] button').forEach((b) => b.classList.toggle('on', b === btn));
      refresh({ keepScroll: true });
    });
  });

  view.querySelectorAll('[data-edit]').forEach((el) => {
    el.addEventListener('click', () => {
      const entry = weights.find((w) => w.id === el.dataset.edit);
      if (entry) weightSheet({ entry, onDone: refresh });
    });
  });
}
