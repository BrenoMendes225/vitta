/* Tela "Dias difíceis" — histórico dos dias marcados, sem julgamento. */

import { icon } from '../icons.js';
import { esc, emptyState } from '../ui.js';
import { allMoods, MOODS } from '../daymood.js';
import { humanDate, fmtMonthYear, todayISO } from '../date.js';
import { badDaySheet } from '../forms.js';
import { refresh, back, go } from '../router.js';

export default async function badDaysScreen(view) {
  const rows = await allMoods();
  const today = todayISO();

  const groups = new Map();
  for (const row of [...rows].reverse()) {
    const key = row.date.slice(0, 7);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const todayRow = rows.find((r) => r.date === today);

  const hero = `
    <section class="card hero soft">
      <div class="soft-emoji">🌱</div>
      <h2 class="soft-title">Dias difíceis também contam</h2>
      <p class="soft-msg">
        Aqui ficam os dias em que não deu. Marcar não apaga nada do que você registrou —
        só tira a cobrança e impede que a sequência quebre.
      </p>
      <button class="btn btn-soft btn-block" data-mark style="margin-top:16px">
        ${icon('moon', 17)} ${todayRow ? 'Editar o dia de hoje' : 'Marcar hoje como difícil'}
      </button>
    </section>`;

  const history = rows.length
    ? [...groups.entries()].map(([key, list]) => `
      <section class="card tight">
        <p class="card-label" style="margin-bottom:4px">${fmtMonthYear(list[0].date)}</p>
        <div class="list">
          ${list.map((row) => {
            const mood = MOODS[row.mood] || MOODS.ruim;
            return `<button class="list-item press" data-edit="${row.id}">
              <span class="li-icon" style="font-size:19px">${mood.emoji}</span>
              <div class="li-main">
                <div class="li-title">${esc(mood.short)}${row.date === today ? ' · hoje' : ''}</div>
                <div class="li-sub">${humanDate(row.date)}${row.reason ? ` · ${esc(row.reason)}` : ''}</div>
                ${row.note ? `<div class="li-sub" style="font-style:italic">${esc(row.note)}</div>` : ''}
              </div>
              <span class="li-end">${icon('right', 15)}</span>
            </button>`;
          }).join('')}
        </div>
      </section>`).join('')
    : `<section class="card">${emptyState(
        'Nenhum dia marcado ainda.<br>Se hoje estiver difícil, marcar aqui é o suficiente.',
      )}</section>`;

  view.innerHTML = `
    <header class="page-head">
      <div style="display:flex;align-items:center;gap:10px">
        <button class="icon-btn bare" data-back aria-label="Voltar">${icon('left', 20)}</button>
        <div>
          <p class="eyebrow">Gentileza</p>
          <h1>Dias difíceis</h1>
        </div>
      </div>
    </header>

    <div class="stack">
      ${hero}
      ${history}
      <p class="disclaimer center">
        Marcar um dia não apaga registros, não conta como falha e não aparece como "erro" no relatório.
      </p>
    </div>`;

  view.querySelector('[data-back]')?.addEventListener('click', () => back('mais'));
  view.querySelector('[data-mark]')?.addEventListener('click', () => {
    badDaySheet({ date: today, entry: todayRow, onDone: refresh });
  });
  view.querySelectorAll('[data-edit]').forEach((el) => {
    el.addEventListener('click', () => {
      const row = rows.find((r) => r.id === el.dataset.edit);
      if (row) badDaySheet({ date: row.date, entry: row, onDone: refresh });
    });
  });
}
