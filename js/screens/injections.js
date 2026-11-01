/* Tela Aplicações — próxima dose, rodízio de local e histórico. */

import { state, saveSettings } from '../store.js';
import { icon } from '../icons.js';
import { fmtNum, esc, emptyState, openSheet, field, str, num, toast } from '../ui.js';
import * as db from '../supabase-db.js';
import { todayISO, humanDate, fmtLong, weekday, relativeDays, fmtMonthYear, cap, addDays } from '../date.js';
import { nextInjection, siteUsage, sortInjections, doseLabel } from '../schedule.js';
import { injectionSheet } from '../forms.js';
import { refresh, go } from '../router.js';

export default async function injectionsScreen(view) {
  const today = todayISO();
  const injections = sortInjections(await db.all('injections')).reverse();
  const cfg = state.settings.injection || {};
  const next = nextInjection(state.settings, injections);
  const sites = cfg.sites?.length ? cfg.sites : ['abdômen D', 'abdômen E', 'coxa D', 'coxa E'];
  const usage = siteUsage(injections, sites);

  /* week progress bar (7 dots) */
  let weekDots = '';
  if (next) {
    const dl = Math.max(0, Math.min(7, 7 - next.days));
    weekDots = `<div class="wk" aria-hidden="true">${[0,1,2,3,4,5,6].map(i => `<i class="${i < dl ? 'f' : ''}"></i>`).join('')}</div>`;
  }

  const hero = next
    ? `<section class="card">
        <div class="row">
          <p class="card-label" style="margin:0">Próxima aplicação</p>
          <span class="chip ${next.days < 0 ? 'danger' : next.days === 0 ? 'amber' : 'accent'}">
            ${next.days < 0 ? `atrasada há ${Math.abs(next.days)}d` : relativeDays(next.date)}
          </span>
        </div>
        <p class="big" style="margin-top:8px">${fmtLong(next.date)}</p>
        <p class="small muted" style="margin:6px 0 0">${cap(weekday(next.date))}${cfg.intervalDays ? ` · a cada ${cfg.intervalDays} dias` : ''}</p>
        <div class="row" style="margin-top:14px">
          <div class="stack-sm">
            <span class="tiny muted">Dose</span>
            <span class="strong">${esc(doseLabel(cfg, next.dose) || '—')}</span>
          </div>
          <div class="stack-sm" style="text-align:right">
            <span class="tiny muted">Local do rodízio</span>
            <span class="strong">${esc(next.site || '—')}</span>
          </div>
        </div>
        ${weekDots}
        <button class="btn btn-primary btn-block" data-add style="margin-top:16px">
          ${icon('syringe', 18)} Registrar aplicação
        </button>
      </section>`
    : '';
  
  const missing = [];
  if (!cfg.name) missing.push('medicamento');
  if (!cfg.dose) missing.push('dose');
  if (!cfg.intervalDays) missing.push('intervalo');
  if (!cfg.startDate) missing.push('data inicial');
  
  const schemePrompt = missing.length
    ? `<section class="card">
        <p class="card-title">${icon('syringe', 16)} Esquema de aplicação</p>
        <p class="small muted" style="margin:0 0 12px">
          ${cfg.name || cfg.dose ? `Falta definir: ${missing.join(', ')}.` : 'Informe o medicamento, a dose e o intervalo para calcular a próxima aplicação e o rodízio.'}
        </p>
        <div class="row" style="gap:8px">
          <button class="btn btn-primary btn-block" data-add style="flex:1">${icon('syringe', 18)} Registrar aplicação</button>
          <button class="btn btn-soft btn-block" data-config style="flex:0 0 140px">Configurar esquema</button>
        </div>
      </section>`
    : `<section class="card">
        <div class="row" style="justify-content:space-between;align-items:center">
          <p class="card-label" style="margin:0">Esquema configurado</p>
          <button class="btn btn-soft btn-sm" data-config>Editar</button>
        </div>
        <p class="small muted" style="margin:8px 0 0">
          ${esc(cfg.name || '—')} · ${esc(doseLabel(cfg) || '—')} · ${cfg.intervalDays ? `a cada ${cfg.intervalDays} dias` : 'intervalo não definido'}
        </p>
        <button class="btn btn-primary btn-block" data-add style="margin-top:16px">${icon('syringe', 18)} Registrar aplicação</button>
      </section>`;
  
  const heroSection = next ? hero + schemePrompt : schemePrompt;

  const rotation = injections.length || cfg.startDate
    ? `<section class="card">
        <div class="row" style="margin-bottom:10px">
          <p class="card-title" style="margin:0">${icon('target', 16)} Rodízio de locais</p>
          <span class="tiny muted">${injections.length} aplicaç${injections.length === 1 ? 'ão' : 'ões'}</span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          ${sites.map((site) => {
            const count = usage.get(site) || 0;
            const isNext = next?.site === site;
            return `<span class="chip ${isNext ? 'accent' : ''}">${esc(site)}${count ? ` · ${count}×` : ''}${isNext ? ' · próximo' : ''}</span>`;
          }).join('')}
        </div>
        <p class="tiny muted" style="margin:10px 0 0">
          Alternar o local reduz irritação e absorção irregular. O app sugere sempre o menos usado na sequência.
        </p>
      </section>`
    : '';

  const groups = new Map();
  for (const inj of injections) {
    const key = inj.date.slice(0, 7);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(inj);
  }

  const history = injections.length
    ? [...groups.entries()].map(([key, rows]) => `
      <section class="card tight">
        <p class="card-label" style="margin-bottom:2px">${fmtMonthYear(rows[0].date)}</p>
        <div class="list">
          ${rows.map((inj) => `<button class="list-item press" data-edit="${inj.id}">
            <span class="li-icon">${icon('syringe', 17)}</span>
            <div class="li-main">
              <div class="li-title">${esc(doseLabel(cfg, inj.dose) || 'Aplicação')}</div>
              <div class="li-sub">${humanDate(inj.date)}${inj.site ? ` · ${esc(inj.site)}` : ''}${inj.note ? ` · ${esc(inj.note)}` : ''}</div>
            </div>
            <span class="li-end">${icon('right', 16)}</span>
          </button>`).join('')}
        </div>
      </section>`).join('')
    : emptyState('Nenhuma aplicação registrada ainda.');

  view.innerHTML = `
    <header class="page-head">
      <div>
        <p class="eyebrow">Tratamento</p>
        <h1>Aplicações</h1>
        <p class="subhead">${cfg.name ? esc(cfg.name) : 'Dose, data e rodízio em dia.'}</p>
      </div>
    </header>

    <div class="stack">
      ${heroSection}
      ${rotation}
      ${injections.length ? `<div class="row" style="padding:4px 2px 0">
        <span class="small strong muted" style="letter-spacing:.03em;text-transform:uppercase;font-size:11px">Histórico</span>
      </div>` : ''}
      ${history}
      <p class="disclaimer">Siga sempre a orientação do seu médico. O app só organiza o que você registra.</p>
    </div>`;

  view.querySelectorAll('[data-add]').forEach((el) => el.addEventListener('click', () => {
    injectionSheet({ onDone: refresh });
  }));
  
  function openSchemeSheet(){
    const cfg = state.settings.injection || {};
    openSheet({
      title: 'Configurar esquema',
      submitLabel: 'Salvar',
      body: `
        ${field({ label: 'Medicamento', name: 'name', value: cfg.name || '' })}
        ${field({ label: 'Dose', name: 'dose', value: cfg.dose || '' })}
        ${field({ label: 'Intervalo entre aplicações (dias)', name: 'intervalDays', inputmode: 'numeric', value: cfg.intervalDays || '' })}
        ${field({ label: 'Data inicial', name: 'startDate', type: 'date', value: cfg.startDate || '' })}
        ${field({ label: 'Locais do rodízio, separados por vírgula', name: 'sites', value: (cfg.sites || []).join(', ') })}
      `,
      onSubmit: async (form) => {
        const sites = str(form, 'sites').split(',').map(s=>s.trim()).filter(Boolean);
        await saveSettings({
          injection: {
            ...cfg,
            name: str(form, 'name'),
            dose: str(form, 'dose'),
            intervalDays: num(form, 'intervalDays'),
            startDate: str(form, 'startDate'),
            sites: sites.length ? sites : cfg.sites,
          }
        });
        toast('Esquema atualizado');
        refresh();
      }
    });
  }
  
  view.querySelectorAll('[data-config]').forEach((el) => el.addEventListener('click', openSchemeSheet));

  view.querySelectorAll('[data-edit]').forEach((el) => {
    el.addEventListener('click', () => {
      const inj = injections.find((i) => i.id === el.dataset.edit);
      if (inj) injectionSheet({ injection: inj, onDone: refresh });
    });
  });
}