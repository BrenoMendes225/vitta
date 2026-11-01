/* Tela Hoje — o painel principal com anéis de progresso. */

import { state, goals } from '../store.js';
import { icon } from '../icons.js';
import { fmtNum, fmtWeight, weightUnitLabel, fmtVol, esc, toast } from '../ui.js';
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
  const days = Array.from({length:7}, (_,i)=> addDays(today, -6+i));
  const [weights, mealsAll, injections, waterToday, symptoms] = await Promise.all([
    db.all('weights'),
    db.all('meals'),
    db.all('injections'),
    getWater(today),
    db.byDate('symptoms', today),
  ]);
  // água dos últimos 7 dias
  const waterHistory = {};
  await Promise.all(days.map(async d => { waterHistory[d] = await getWater(d); }));
  const mealsByDay = {};
  days.forEach(d => { mealsByDay[d] = mealsAll.filter(m=>m.date===d); });

  const g = goals();
  const summary = weightSummary(weights, state.settings);
  const meals = mealsByDay[today] || [];
  const totals = mealTotals(meals);
  const water = waterHistory[today] || 0;
  const next = nextInjection(state.settings, injections);
  const firstName = (state.settings.name || '').trim().split(' ')[0];
  const spark = summary.daily.slice(-14).map((p) => ({ date: p.date, value: p.value }));

  /* anéis: água (externa), proteína (média), aplicação (interna) */
  const waterPct = g.water ? Math.min(1, water / g.water) : 0;
  const proteinPct = g.protein ? Math.min(1, totals.protein / g.protein) : 0;
  const hasInj = !!(state.settings.injection?.intervalDays && state.settings.injection?.startDate);
  const cycPct = hasInj && next ? Math.min(1, Math.max(0, (7 - next.days) / 7)) : 0;
  const metas = [];
  if (g.water) metas.push(waterPct);
  if (g.protein) metas.push(proteinPct);
  if (hasInj) metas.push(cycPct);
  const overallPct = metas.length ? Math.round((metas.reduce((a,b)=>a+b,0)/metas.length)*100) : 0;
  const overallLabel = overallPct === 0 && metas.length ? 'Vamos começar' : `${overallPct}%`;

  const weightBlock = summary.latest
    ? `
      <div class="row start" style="align-items:flex-end">
        <div>
          <p class="card-label">Peso atual</p>
          <p class="big">${fmtWeight(summary.latest.value)}<span class="unit">${weightUnitLabel()}</span></p>
          <p class="small" style="margin:8px 0 0">
            ${summary.delta7 != null
              ? `<span class="delta ${summary.delta7 < -0.05 ? 'dn' : summary.delta7 > 0.05 ? 'up' : 'flat'}">
                   ${summary.delta7 < -0.05 ? '−' : summary.delta7 > 0.05 ? '+' : '±'} ${fmtNum(Math.abs(summary.delta7), 1)} ${weightUnitLabel()}
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

  const ringsCard = `
    <section class="card hero" style="padding:20px">
      <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:12px">
        <p class="card-label" style="margin:0">Ritual de hoje</p>
        <span class="tiny muted">Constância, não perfeição</span>
      </div>
      <div class="row" style="align-items:center;gap:24px">
        <div style="position:relative;width:140px;height:140px">
          <svg viewBox="0 0 140 140" style="width:100%;height:100%;transform:rotate(-90deg)">
            <circle cx="70" cy="70" r="60" fill="none" stroke="var(--s2)" stroke-width="12"/>
            <circle cx="70" cy="70" r="60" fill="none" stroke="var(--w)" stroke-width="12" stroke-linecap="round"
              stroke-dasharray="${2*Math.PI*60}" stroke-dashoffset="${2*Math.PI*60*(1-waterPct)}" style="transition:stroke-dashoffset .8s ease"/>
            <circle cx="70" cy="70" r="44" fill="none" stroke="var(--s2)" stroke-width="12"/>
            <circle cx="70" cy="70" r="44" fill="none" stroke="var(--p)" stroke-width="12" stroke-linecap="round"
              stroke-dasharray="${2*Math.PI*44}" stroke-dashoffset="${2*Math.PI*44*(1-proteinPct)}" style="transition:stroke-dashoffset .8s ease"/>
            <circle cx="70" cy="70" r="28" fill="none" stroke="var(--s2)" stroke-width="12"/>
            <circle cx="70" cy="70" r="28" fill="none" stroke="var(--a)" stroke-width="12" stroke-linecap="round"
              stroke-dasharray="${2*Math.PI*28}" stroke-dashoffset="${2*Math.PI*28*(1-cycPct)}" style="transition:stroke-dashoffset .8s ease"/>
          </svg>
          <div style="position:absolute;inset:0;display:grid;place-items:center;text-align:center">
            <div>
              <div style="font-size:28px;font-weight:700;line-height:1">${overallLabel}</div>
              <div class="tiny muted">média das metas</div>
            </div>
          </div>
        </div>
        <div style="flex:1">
          ${[
            { key:'water', label:'Água', icon:'drop', color:'var(--w)', cur:`${fmtVol(water)} L`, meta:`${fmtVol(g.water)} L`, pct:waterPct, action:'+250 ml', fn:'water', history: days.map(d=> (waterHistory[d]||0) >= g.water ? 1 : 0) },
            { key:'protein', label:'Proteína', icon:'sparkles', color:'var(--p)', cur:`${fmtNum(totals.protein,0)} g`, meta:`${fmtNum(g.protein,0)} g`, pct:proteinPct, action:'+20 g', fn:'protein', history: days.map(d=> { const m = mealsByDay[d]||[]; const p = m.reduce((s,x)=>s+(x.protein||0),0); return g.protein && p>=g.protein ?1:0; }) },
            { key:'injection', label:'Aplicação', icon:'syringe', color:'var(--a)', cur:hasInj? (next? (next.days<=0?'Hoje':'Em '+relativeDays(next.date)):'—') : '—', meta:hasInj?'Configurada':'Não configurada', pct:cycPct, action:hasInj?'Marcar':'Configurar', fn:hasInj?'injection':'settings', history: hasInj ? days.map(d=> injections.some(i=>i.date===d) ?1:0) : [] }
          ].map(item => `
            <div class="row" style="align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd);cursor:pointer" data-act="${item.fn}" data-key="${item.key}">
              <div style="width:36px;height:36px;border-radius:12px;display:grid;place-items:center;background:${item.color}22;color:${item.color}">${icon(item.icon,18)}</div>
              <div style="flex:1;min-width:0">
                <div style="display:flex;justify-content:space-between;align-items:baseline">
                  <span style="font-weight:600">${item.label}</span>
                  <span class="tiny muted">${item.cur} / ${item.meta}</span>
                </div>
                <div style="height:6px;background:var(--s2);border-radius:999px;margin-top:6px;overflow:hidden">
                  <div style="height:100%;width:${Math.round(item.pct*100)}%;background:${item.color};transition:width .6s ease"></div>
                </div>
                <div style="display:flex;justify-content:space-between;margin-top:2px;align-items:center">
                  <span class="tiny muted">${Math.round(item.pct*100)}%</span>
                  <div style="display:flex;gap:4px">
                    ${item.history?.map((ok,i)=>`<span style="width:6px;height:6px;border-radius:50%;background:${ok?item.color:'var(--mut)'};opacity:${ok?1:0.4}"></span>`).join('')||''}
                  </div>
                  <button class="btn btn-soft" style="padding:2px 8px;font-size:12px" data-quick="${item.key}">${item.action}</button>
                </div>
                ${Math.round(item.pct*100)===100 ? `<div class="tiny" style="color:var(--ok);margin-top:4px">Meta alcançada com carinho hoje.</div>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>`;


  view.innerHTML = `
    <header class="page-head">
      <div>
        <p class="eyebrow">${cap(humanDate(today))}</p>
        <h1>${esc(greeting())}${firstName ? `, ${esc(firstName)}` : ''}</h1>
        <p class="subhead">${summary.total != null && summary.total < -0.05
          ? `Você já está ${fmtNum(Math.abs(summary.total), 1)} ${weightUnitLabel()} abaixo do início.`
          : state.settings.goalWeight && summary.latest
            ? `Faltam ${fmtNum(Math.max(0, summary.latest.value - state.settings.goalWeight), 1)} ${weightUnitLabel()} para a meta.`
            : 'Um dia de cada vez.'}</p>
      </div>
      <button class="avatar" data-go="ajustes" aria-label="Ajustes">${esc((firstName || 'V')[0].toUpperCase())}</button>
    </header>

    <div class="stack">
      ${ringsCard}

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
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-quick]')) return;
      const act = el.dataset.act;
      if (act === 'weight') return weightSheet({ onDone: refresh });
      if (act === 'water') return waterSheet({ current: water, onDone: refresh });
      if (act === 'meal') return mealSheet({ onDone: refresh });
      if (act === 'injection') return injectionSheet({ onDone: refresh });
      if (act === 'symptom') return symptomSheet({ onDone: refresh });
      if (act === 'settings') return go('ajustes');
      if (act === 'protein') return mealSheet({ onDone: refresh });
    });
  });

  view.querySelectorAll('[data-quick]').forEach((el) => {
    el.addEventListener('click', async (e) => {
      e.stopPropagation();
      const key = el.dataset.quick;
      if (key === 'water') {
        const total = await addWater(250, today);
        toast(`+250 ml · ${fmtVol(total)} L`);
        refresh({ keepScroll: true });
      } else if (key === 'protein') {
        // placeholder quick add protein via meal sheet
        toast('Abra o diário para registrar proteína');
        go('diario');
      } else if (key === 'injection') {
        injectionSheet({ onDone: refresh });
      }
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