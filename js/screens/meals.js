/* Tela Diário — refeições do dia, macros e análise por IA. */

import { state, goals } from '../store.js';
import { icon } from '../icons.js';
import { fmtNum, fmtKcal, progressBar, esc, emptyState, openSheet, confirmSheet, toast } from '../ui.js';
import * as db from '../db.js';
import { todayISO, addDays, humanDate, fmtShort } from '../date.js';
import { mealTotals } from '../stats.js';
import { mealSheet } from '../forms.js';
import { refresh, go } from '../router.js';

let cursor = todayISO();

const MACROS = [
  { key: 'protein', label: 'Proteína', unit: 'g', color: 'var(--protein)' },
  { key: 'carbs', label: 'Carboidrato', unit: 'g', color: 'var(--water)' },
  { key: 'fat', label: 'Gordura', unit: 'g', color: 'var(--amber)' },
];

export default async function mealsScreen(view) {
  const today = todayISO();
  const meals = (await db.byDate('meals', cursor)).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const totals = mealTotals(meals);
  const g = goals();
  const isToday = cursor === today;
  const canGoForward = cursor < today;

  const fallbackKcal = totals.kcal;

  const macrosCard = `
    <section class="card">
      <div class="row" style="margin-bottom:2px">
        <p class="card-label" style="margin:0">Calorias</p>
        ${g.kcal ? `<span class="chip">meta ${fmtKcal(g.kcal)}</span>` : `<span class="tiny muted">sem meta definida</span>`}
      </div>
      <p class="big md" style="margin-top:6px">${fmtKcal(fallbackKcal)}<span class="unit">kcal</span></p>
      ${g.kcal ? progressBar(fallbackKcal, g.kcal) : ''}
      <div class="grid-3" style="margin-top:12px">
        ${MACROS.map((m) => `<div>
          <p class="tiny muted" style="margin:0 0 2px">${m.label}</p>
          <p class="strong" style="margin:0;font-size:15px;color:${m.color};font-variant-numeric:tabular-nums">
            ${fmtNum(totals[m.key], 0)}<span class="tiny muted" style="font-weight:500"> g</span>
          </p>
        </div>`).join('')}
      </div>
    </section>`;

  const list = meals.length
    ? `<div class="list">${meals.map((m) => `
        <button class="list-item press" data-meal="${m.id}">
          ${m.thumb
            ? `<span class="li-icon" style="padding:0;overflow:hidden"><img src="${m.thumb}" alt="" style="width:100%;height:100%;object-fit:cover"></span>`
            : `<span class="li-icon">${icon('bowl', 17)}</span>`}
          <div class="li-main">
            <div class="li-title">${esc(m.text || (m.thumb ? 'Refeição com foto' : 'Refeição'))}</div>
            <div class="li-sub">${m.time || '—'}${m.protein ? ` · ${fmtNum(m.protein, 0)} g proteína` : ''}${m.confidence ? ` · IA ${esc(m.confidence)}` : ''}</div>
          </div>
          <div class="li-end">${m.kcal ? `${fmtNum(m.kcal)} kcal` : ''}</div>
        </button>`).join('')}</div>`
    : emptyState(
      isToday ? 'Nada registrado hoje ainda.<br>Fotografe o prato e deixe a IA estimar.' : 'Nenhuma refeição registrada neste dia.',
      `<button class="btn btn-primary" data-add>${icon('plus', 17)} Registrar</button>`,
    );

  view.innerHTML = `
    <header class="page-head">
      <div>
        <p class="eyebrow">Alimentação</p>
        <h1>Diário</h1>
      </div>
      <button class="icon-btn" data-add aria-label="Nova refeição">${icon('plus', 20)}</button>
    </header>

    <div class="row" style="margin:-6px 0 14px;gap:8px">
      <button class="icon-btn" data-day="-1" aria-label="Dia anterior">${icon('left', 18)}</button>
      <button class="btn btn-sm btn-ghost" data-today style="flex:1" ${isToday ? 'disabled' : ''}>
        ${icon('calendar', 15)} ${humanDate(cursor)}
      </button>
      <button class="icon-btn" data-day="1" aria-label="Próximo dia" ${canGoForward ? '' : 'disabled style="opacity:.35"'}>${icon('right', 18)}</button>
    </div>

    <div class="stack">
      ${macrosCard}
      ${list}
      <p class="disclaimer">
        Estimativas geradas por IA podem errar. Use como referência, não como verdade absoluta — ajuste os valores quando quiser.
      </p>
    </div>`;

  view.querySelector('[data-add]')?.addEventListener('click', () => mealSheet({ date: cursor, onDone: refresh }));
  view.querySelector('[data-today]')?.addEventListener('click', () => {
    cursor = todayISO();
    refresh();
  });
  view.querySelectorAll('[data-day]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = addDays(cursor, Number(btn.dataset.day));
      if (next > today) return;
      cursor = next;
      refresh();
    });
  });

  view.querySelectorAll('[data-meal]').forEach((el) => {
    el.addEventListener('click', () => {
      const meal = meals.find((m) => m.id === el.dataset.meal);
      if (meal) openMealDetail(meal);
    });
  });
}

async function openMealDetail(meal) {
  let photoURL = null;
  if (meal.photoId) {
    try { photoURL = await db.getPhotoURL(meal.photoId); } catch { /* sem foto */ }
  }

  const api = openSheet({
    title: meal.time ? `Refeição · ${meal.time}` : 'Refeição',
    hideSubmit: true,
    hideCancel: true,
    body: `
      ${photoURL ? `<div class="meal-photo"><img src="${photoURL}" alt="Foto da refeição"></div>`
        : meal.thumb ? `<div class="meal-photo"><img src="${meal.thumb}" alt=""></div>` : ''}
      ${meal.text ? `<p style="margin:0;font-size:15px;line-height:1.5">${esc(meal.text)}</p>` : ''}
      <div class="grid-3">
        ${[
          ['Calorias', meal.kcal ? fmtNum(meal.kcal) : '—', 'kcal'],
          ['Proteína', fmtNum(meal.protein, 0), 'g'],
          ['Carbo', fmtNum(meal.carbs, 0), 'g'],
        ].map(([l, v, u]) => `<div class="card tight flat center">
          <p class="tiny muted" style="margin:0 0 2px">${l}</p>
          <p class="strong" style="margin:0;font-size:16px">${v}<span class="tiny muted"> ${u}</span></p>
        </div>`).join('')}
      </div>
      ${meal.comment ? `<div class="insight">${esc(meal.comment)}</div>` : ''}
      <div class="row" style="gap:10px">
        <button class="btn btn-soft" data-edit style="flex:1">${icon('edit', 16)} Editar</button>
        <button class="btn btn-ghost" data-del style="flex:1">${icon('trash', 16)} Excluir</button>
      </div>
      <p class="tiny muted" style="margin:0;text-align:center">${meal.confidence ? `Confiança da IA: ${esc(meal.confidence)}` : ''}</p>`,
    onMount: (form, sheet) => {
      sheet.backdrop.querySelector('[data-edit]').addEventListener('click', () => {
        closeWithCleanup();
        mealSheet({ date: meal.date, meal, onDone: refresh });
      });
      sheet.backdrop.querySelector('[data-del]').addEventListener('click', async () => {
        const ok = await confirmSheet({
          title: 'Excluir refeição',
          message: 'A refeição e a foto dela serão apagadas.',
          confirmLabel: 'Excluir',
        });
        if (!ok) return;
        await db.remove('meals', meal.id);
        if (meal.photoId) await db.remove('photos', meal.photoId);
        closeWithCleanup();
        toast('Refeição excluída');
        refresh({ keepScroll: true });
      });
    },
    onClose: () => {
      if (photoURL) URL.revokeObjectURL(photoURL);
      photoURL = null;
    },
  });

  function closeWithCleanup() {
    api.close();
  }
}
