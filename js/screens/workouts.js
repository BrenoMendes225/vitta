/* Tela Treino — presença, duração e sequência de dias. */

import { icon } from '../icons.js';
import { field, selectField, str, num, esc, emptyState, openSheet, confirmSheet, toast } from '../ui.js';
import * as db from '../db.js';
import { todayISO, humanDate, addDays, startOfWeek, diffDays } from '../date.js';
import { streak } from '../stats.js';
import { refresh, back } from '../router.js';

const TYPES = ['Força', 'Cardio', 'Caminhada', 'Corrida', 'Pilates', 'Funcional', 'Outro'];
const TYPE_ICON = { Cardio: 'heart', Caminhada: 'activity', Corrida: 'trend', Pilates: 'moon' };

export default async function workoutsScreen(view) {
  const today = todayISO();
  const rows = (await db.all('workouts')).sort((a, b) => a.date.localeCompare(b.date));
  const recent = rows.slice().reverse();
  const dates = [...new Set(rows.map((r) => r.date))];
  const seq = streak(dates, today);
  const weekStart = startOfWeek(today);
  const thisWeek = rows.filter((r) => r.date >= weekStart);
  const minutes = thisWeek.reduce((a, r) => a + (Number(r.minutes) || 0), 0);

  const summary = `<div class="grid-3">
    <section class="card tight center">
      <p class="card-label" style="font-size:10.5px">Sequência</p>
      <p class="metric" style="font-size:20px">${seq}<span class="tiny muted"> d</span></p>
    </section>
    <section class="card tight center">
      <p class="card-label" style="font-size:10.5px">Semana</p>
      <p class="metric" style="font-size:20px">${thisWeek.length}<span class="tiny muted"> treinos</span></p>
    </section>
    <section class="card tight center">
      <p class="card-label" style="font-size:10.5px">Minutos</p>
      <p class="metric" style="font-size:20px">${minutes}</p>
    </section>
  </div>`;

  const list = recent.length
    ? `<section class="card tight">
        <p class="card-label" style="padding:2px 2px 6px">Histórico</p>
        <div class="list">
          ${recent.map((r) => `<button class="list-item press" data-edit="${r.id}">
            <span class="li-icon">${icon(TYPE_ICON[r.type] || 'dumbbell', 17)}</span>
            <div class="li-main">
              <div class="li-title">${esc(r.type || 'Treino')}${r.minutes ? ` · ${r.minutes} min` : ''}</div>
              <div class="li-sub">${humanDate(r.date)}${r.note ? ` · ${esc(r.note)}` : ''}</div>
            </div>
            <span class="li-end">${icon('right', 15)}</span>
          </button>`).join('')}
        </div>
      </section>`
    : `<section class="card">${emptyState(
        'Nenhum treino registrado.<br>Musculação ajuda a preservar massa magra durante o emagrecimento.',
        `<button class="btn btn-primary" data-add>Registrar treino</button>`,
      )}</section>`;

  view.innerHTML = `
    <header class="page-head">
      <div style="display:flex;align-items:center;gap:10px">
        <button class="icon-btn bare" data-back aria-label="Voltar">${icon('left', 20)}</button>
        <div>
          <p class="eyebrow">Movimento</p>
          <h1>Treino</h1>
        </div>
      </div>
      <button class="icon-btn" data-add aria-label="Registrar treino">${icon('plus', 20)}</button>
    </header>
    <div class="stack">
      ${summary}
      ${list}
      <p class="disclaimer">Séries e cargas detalhadas entram na próxima versão. Por enquanto, presença e duração já contam.</p>
    </div>`;

  view.querySelector('[data-back]')?.addEventListener('click', () => back('mais'));
  view.querySelectorAll('[data-add]').forEach((el) => el.addEventListener('click', () => sheet()));
  view.querySelectorAll('[data-edit]').forEach((el) => {
    el.addEventListener('click', () => {
      const row = rows.find((r) => r.id === el.dataset.edit);
      if (row) sheet(row);
    });
  });
}

function sheet(entry = null) {
  openSheet({
    title: entry ? 'Editar treino' : 'Registrar treino',
    submitLabel: entry ? 'Salvar' : 'Registrar',
    body: `<div class="form-grid">
      ${field({ label: 'Data', name: 'date', type: 'date', value: entry?.date || todayISO(), required: true })}
      ${selectField({ label: 'Tipo', name: 'type', value: entry?.type || 'Força', options: TYPES })}
      ${field({ label: 'Duração (min)', name: 'minutes', inputmode: 'numeric', value: entry?.minutes ?? 45 })}
      ${field({ label: 'Observação', name: 'note', span2: true, value: entry?.note || '', placeholder: 'grupo muscular, sensação, carga…' })}
      ${entry ? `<button type="button" class="btn btn-danger btn-block" data-delete>${icon('trash', 17)} Excluir</button>` : ''}
    </div>`,
    onMount: (form) => {
      form.querySelector('[data-delete]')?.addEventListener('click', async () => {
        const ok = await confirmSheet({ title: 'Excluir treino', message: 'O registro será apagado.', confirmLabel: 'Excluir' });
        if (!ok) return;
        await db.remove('workouts', entry.id);
        toast('Treino excluído');
        refresh({ keepScroll: true });
      });
    },
    onSubmit: async (form) => {
      await db.put('workouts', {
        ...(entry || {}),
        date: str(form, 'date') || todayISO(),
        type: str(form, 'type'),
        minutes: num(form, 'minutes', 0),
        note: str(form, 'note'),
        createdAt: entry?.createdAt || new Date().toISOString(),
      });
      toast('Treino registrado');
      refresh({ keepScroll: true });
    },
  });
}