/* Tela Peso — gráfico com área gradiente, strip de fotos, histórico. */

import { state, goals } from '../store.js';
import { icon } from '../icons.js';
import { fmtNum, fmtWeight, weightUnitLabel, signed, esc, emptyState, openSheet } from '../ui.js';
import * as db from '../supabase-db.js';
import { todayISO, addDays, humanDate, fmtMonthYear, diffDays } from '../date.js';
import { weightSummary, movingAverage, sortAsc } from '../stats.js';
import { weightChart } from '../charts.js';
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

  const rangePills = `
    <div class="rg">
      ${[['30', '30 dias'], ['90', '90 dias'], ['all', 'Tudo']].map(([v, l]) => `
        <button class="${range === v ? 'on' : ''}" onclick="setRange('${v}')">${l}</button>`).join('')}
    </div>`;

  const chartCard = points.length
    ? `<section class="card">
        <div class="row" style="margin-bottom:4px">
          <p class="card-title" style="margin:0">Evolução</p>
          ${rangePills}
        </div>
        <div class="row" style="align-items:flex-end;margin:10px 0 0">
          <div>
            <p class="card-label" style="margin:0">Média de 7 dias</p>
            <p class="metric" style="font-size:26px">${fmtWeight(summary.maNow)} <span class="tiny muted">${weightUnitLabel()}</span></p>
          </div>
          <div style="text-align:right">
            <p class="small" style="margin:0">
              ${summary.delta7 != null
                ? `<span class="delta ${summary.delta7 < -0.05 ? 'dn' : summary.delta7 > 0.05 ? 'up' : 'flat'}">${signed(summary.delta7)} ${weightUnitLabel()}</span>`
                : '<span class="muted">—</span>'}
            </p>
            <p class="tiny muted" style="margin:2px 0 0">vs. semana anterior</p>
          </div>
        </div>
        ${weightChart(points, summary.goalWeight)}
        <div class="row" style="margin-top:6px">
          <span class="tiny muted">área = média de 7 dias · círculo = último registro</span>
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
        <div class="bar"><i style="width:${(summary.progress * 100).toFixed(1)}%"></i></div>
        <p class="tiny muted" style="margin:8px 0 0">${fmtWeight(summary.startWeight)} ${weightUnitLabel()} → ${fmtWeight(summary.goalWeight)} ${weightUnitLabel()}${bmi ? ` · IMC ${fmtNum(bmi, 1)} (${bmiLabel(bmi)})` : ''}</p>
      </section>` : ''}`
    : '';

  const sortedDesc = sortAsc(weights).reverse();
  const groups = new Map();
  for (const row of sortedDesc) {
    const key = row.date.slice(0, 7);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  /* photo strip — horizontal scroll */
  const weightPhotos = photos.filter((p) => p.kind === 'weight');
  const photoURLs = weightPhotos.map((p) => URL.createObjectURL(p.blob));
  const photoStrip = weightPhotos.length
    ? `<div class="card">
        <h2 class="card-title">${icon('photo', 16)} Fotos de progresso</h2>
        <div class="strip">
          ${weightPhotos.map((p, i) => {
            const kg = weights.find((w) => w.photoId === p.id)?.kg;
            const date = p.meta?.date || p.date || '';
            return `<button class="ph" data-photo="${i}">
              <img src="${photoURLs[i]}" alt="Foto de ${humanDate(date)}">
              <span>${date ? humanDate(date) : ''}${kg ? ` · ${fmtWeight(kg)} ${weightUnitLabel()}` : ''}</span>
            </button>`;
          }).join('')}
        </div>
      </div>`
    : '';

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
                  <div class="li-title">${fmtWeight(r.kg)} ${weightUnitLabel()} ${r.photoId ? `<span class="muted" style="font-weight:400">· foto</span>` : ''}</div>
                  <div class="li-sub">${humanDate(r.date)}${r.note ? ` · ${esc(r.note)}` : ''}</div>
                </div>
                <div class="li-end">${delta != null ? `<span class="delta ${delta < -0.05 ? 'dn' : delta > 0.05 ? 'up' : 'flat'}">${signed(delta)}</span>` : ''}</div>
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
    </header>

    <div class="stack">
      ${chartCard}
      ${statsCard}
      ${photoStrip}

      <div class="row" style="padding:4px 2px 0">
        <span class="small strong muted" style="letter-spacing:.03em;text-transform:uppercase;font-size:11px">Histórico</span>
      </div>
      ${history || emptyState('Seus registros aparecem aqui.')}
    </div>`;

  view.querySelector('[data-add]')?.addEventListener('click', () => weightSheet({ onDone: refresh }));

  // range pills - delegado no window
  window.setRange = (v) => {
    range = v;
    refresh({ keepScroll: true });
  };

  view.querySelectorAll('[data-photo]').forEach((el) => {
    el.addEventListener('click', () => {
      const i = Number(el.dataset.photo);
      const p = weightPhotos[i];
      if (!p) return;
      const kg = weights.find((w) => w.photoId === p.id)?.kg;
      const date = p.meta?.date || p.date || '';
      openSheet({
        title: date ? humanDate(date) : 'Foto',
        hideSubmit: true,
        hideCancel: true,
        body: `
          <img class="zi" src="${photoURLs[i]}" alt="Foto de progresso">
          ${kg ? `<p class="big" style="font-size:32px">${fmtWeight(kg)}<span class="unit">${weightUnitLabel()}</span></p>` : ''}
          <p class="small muted" style="margin:0">${date ? humanDate(date) : ''}</p>`,
      });
    });
  });

  view.querySelectorAll('[data-edit]').forEach((el) => {
    el.addEventListener('click', () => {
      const entry = weights.find((w) => w.id === el.dataset.edit);
      if (entry) weightSheet({ entry, onDone: refresh });
    });
  });
}