/* Tela Sintomas — check-in diário de 0 a 5 e histórico. */

import { icon } from '../icons.js';
import { fmtNum, esc, emptyState } from '../ui.js';
import * as db from '../supabase-db.js';
import { todayISO, humanDate } from '../date.js';
import { symptomSheet } from '../forms.js';
import { refresh, back } from '../router.js';

const SCALE = [
  { key: 'nausea', label: 'Náusea', color: 'var(--a)' },
  { key: 'constipation', label: 'Intestino', color: 'var(--w)' },
  { key: 'fatigue', label: 'Cansaço', color: 'var(--p)' },
  { key: 'appetite', label: 'Apetite', color: 'var(--ok)' },
];

export default async function symptomsScreen(view) {
  const rows = (await db.all('symptoms')).sort((a, b) => a.date.localeCompare(b.date));
  const today = todayISO();
  const todayRow = rows.find((r) => r.date === today) || null;
  const recent = rows.slice(-14).reverse();

  const todayCard = todayRow
    ? `<section class="card">
        <div class="row">
          <p class="card-label" style="margin:0">Check-in de hoje</p>
          <button class="btn btn-sm btn-soft" data-add>${icon('edit', 15)} Editar</button>
        </div>
        <div class="grid-2" style="margin-top:12px;gap:12px">
          ${SCALE.map((s) => `<div>
            <p class="tiny muted" style="margin:0 0 4px">${s.label}</p>
            <div class="row" style="gap:6px;justify-content:flex-start">
              <span class="strong" style="font-size:18px;color:${Number(todayRow[s.key]) >= 3 ? s.color : 'var(--ink)'}">${fmtNum(todayRow[s.key] ?? 0, 0)}</span>
              <span class="tiny muted">/ 5</span>
            </div>
          </div>`).join('')}
        </div>
        ${todayRow.note ? `<p class="small muted" style="margin:12px 0 0">${esc(todayRow.note)}</p>` : ''}
      </section>`
    : `<section class="card">
        <p class="card-title">${icon('activity', 16)} Como você está hoje?</p>
        <p class="small muted" style="margin:0 0 14px">
          Registrar sintomas ajuda a identificar padrões e leva dados concretos para a consulta.
        </p>
        <button class="btn btn-primary btn-block" data-add>Fazer check-in</button>
      </section>`;

  const history = recent.length
    ? `<section class="card tight">
        <p class="card-label" style="padding:2px 2px 8px">Últimos check-ins</p>
        <div class="list">
          ${recent.map((r) => `<button class="list-item press" data-row="${r.id}">
            <div class="li-main">
              <div class="li-title">${humanDate(r.date)}</div>
              <div class="li-sub" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">
                ${SCALE.map((s) => `<span class="chip" style="font-size:11px;padding:2px 8px">${s.label} ${r[s.key] ?? 0}</span>`).join('')}
              </div>
            </div>
            <span class="li-end">${icon('right', 15)}</span>
          </button>`).join('')}
        </div>
      </section>`
    : emptyState('Seu histórico de sintomas aparece aqui.');

  view.innerHTML = `
    <header class="page-head">
      <div style="display:flex;align-items:center;gap:10px">
        <button class="icon-btn bare" data-back aria-label="Voltar">${icon('left', 20)}</button>
        <div>
          <p class="eyebrow">Corpo</p>
          <h1>Sintomas</h1>
        </div>
      </div>
      <button class="icon-btn" data-add aria-label="Check-in">${icon('plus', 20)}</button>
    </header>
    <div class="stack">
      ${todayCard}
      ${history}
      <p class="disclaimer">Estes dados são seus. Leve-os para a consulta se algo incomodar — dor intensa, vômitos persistentes ou desidratação pedem avaliação médica.</p>
    </div>`;

  view.querySelector('[data-back]')?.addEventListener('click', () => back('mais'));
  view.querySelectorAll('[data-add]').forEach((el) => {
    el.addEventListener('click', () => symptomSheet({ entry: todayRow, onDone: refresh }));
  });
  view.querySelectorAll('[data-row]').forEach((el) => {
    el.addEventListener('click', () => {
      const row = rows.find((r) => r.id === el.dataset.row);
      if (row) symptomSheet({ date: row.date, entry: row, onDone: refresh });
    });
  });
}