/* Tela Medidas — cintura, quadril, braço e coxa. */

import { icon } from '../icons.js';
import { fmtNum, signed, field, esc, emptyState, openSheet, confirmSheet, toast, str, num } from '../ui.js';
import * as db from '../db.js';
import { todayISO, humanDate, fmtMonthYear } from '../date.js';
import { sortAsc } from '../stats.js';
import { refresh, back } from '../router.js';

const METRICS = [
  { key: 'waist', label: 'Cintura', short: 'cint.' },
  { key: 'hip', label: 'Quadril', short: 'quad.' },
  { key: 'arm', label: 'Braço', short: 'braço' },
  { key: 'thigh', label: 'Coxa', short: 'coxa' },
  { key: 'chest', label: 'Peito', short: 'peito' },
];

export default async function measurementsScreen(view) {
  const rows = sortAsc(await db.all('measurements'));
  const latest = rows[rows.length - 1] || null;
  const previous = rows[rows.length - 2] || null;

  const card = latest
    ? `<section class="card">
        <div class="row">
          <p class="card-label" style="margin:0">Última medição</p>
          <span class="chip">${humanDate(latest.date)}</span>
        </div>
        <div class="grid-2" style="margin-top:12px;gap:10px">
          ${METRICS.filter((m) => latest[m.key]).map((m) => {
            const delta = previous?.[m.key] && latest[m.key] ? latest[m.key] - previous[m.key] : null;
            return `<div>
              <p class="tiny muted" style="margin:0 0 2px">${m.label}</p>
              <p style="margin:0;font-size:19px;font-weight:700;font-variant-numeric:tabular-nums">
                ${fmtNum(latest[m.key], 1)} <span class="tiny muted">cm</span>
              </p>
              ${delta != null ? `<p class="tiny" style="margin:2px 0 0;color:${delta < 0 ? 'var(--ok)' : 'var(--mut)'}">${signed(delta, 1)} cm</p>` : ''}
            </div>`;
          }).join('')}
        </div>
        ${latest.note ? `<p class="small muted" style="margin:12px 0 0">${esc(latest.note)}</p>` : ''}
        <button class="btn btn-soft btn-block" data-add style="margin-top:14px">${icon('ruler', 17)} Nova medição</button>
      </section>`
    : `<section class="card">${emptyState(
        'A balança trava, mas a fita métrica continua mostrando progresso.<br>Registre a primeira medição.',
        `<button class="btn btn-primary" data-add>Registrar medidas</button>`,
      )}</section>`;

  const history = rows.slice().reverse().slice(1).length
    ? `<section class="card tight">
        <p class="card-label" style="padding:2px 2px 6px">Histórico</p>
        <div class="list">
          ${rows.slice().reverse().slice(1).map((r) => `<button class="list-item press" data-edit="${r.id}">
            <span class="li-icon">${icon('ruler', 17)}</span>
            <div class="li-main">
              <div class="li-title">${METRICS.filter((m) => r[m.key]).map((m) => `${m.short} ${fmtNum(r[m.key], 1)}`).join(' · ')} <span class="muted" style="font-weight:500">cm</span></div>
              <div class="li-sub">${humanDate(r.date)}</div>
            </div>
            <span class="li-end">${icon('right', 15)}</span>
          </button>`).join('')}
        </div>
      </section>`
    : '';

  view.innerHTML = `
    <header class="page-head">
      <div style="display:flex;align-items:center;gap:10px">
        <button class="icon-btn bare" data-back aria-label="Voltar">${icon('left', 20)}</button>
        <div>
          <p class="eyebrow">Corpo</p>
          <h1>Medidas</h1>
        </div>
      </div>
      <button class="icon-btn" data-add aria-label="Nova medição">${icon('plus', 20)}</button>
    </header>
    <div class="stack">
      ${card}
      ${history}
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
    title: entry ? 'Editar medidas' : 'Nova medição',
    submitLabel: entry ? 'Salvar' : 'Registrar',
    body: `<div class="form-grid">
      ${field({ label: 'Data', name: 'date', type: 'date', value: entry?.date || todayISO(), span2: true })}
      ${METRICS.map((m) => field({
        label: `${m.label} (cm)`, name: m.key, inputmode: 'decimal',
        value: entry?.[m.key] ?? '', placeholder: '—',
      })).join('')}
      ${field({ label: 'Observação', name: 'note', type: 'textarea', value: entry?.note || '', rows: 2, span2: true })}
      ${entry ? `<button type="button" class="btn btn-danger btn-block" data-delete>${icon('trash', 17)} Excluir</button>` : ''}
    </div>`,
    onMount: (form) => {
      form.querySelector('[data-delete]')?.addEventListener('click', async () => {
        const ok = await confirmSheet({ title: 'Excluir medição', message: 'Esta medição será apagada.', confirmLabel: 'Excluir' });
        if (!ok) return;
        await db.remove('measurements', entry.id);
        toast('Medição excluída');
        refresh({ keepScroll: true });
      });
    },
    onSubmit: async (form) => {
      const payload = { ...(entry || {}), date: str(form, 'date') || todayISO(), note: str(form, 'note') };
      for (const m of METRICS) {
        const v = num(form, m.key);
        if (v) payload[m.key] = v;
        else delete payload[m.key];
      }
      if (!METRICS.some((m) => payload[m.key])) throw new Error('Informe pelo menos uma medida.');
      await db.put('measurements', payload);
      toast('Medidas registradas');
      refresh({ keepScroll: true });
    },
  });
}