/* Formulários reutilizáveis (folhas) — registro de peso, refeição, água, aplicação e sintomas. */

import {
  openSheet, confirmSheet, field, selectField, str, num, toast,
  photoInput, wirePhotoPreview, esc, fmtNum,
} from './ui.js';
import { icon } from './icons.js';
import * as db from './db.js';
import { state } from './store.js';
import { todayISO, nowHM } from './date.js';
import { compressImage, thumbnail } from './image.js';
import { analyzeMeal } from './gemini.js';
import { nextInjection, doseLabel } from './schedule.js';
import { getWater, setWater } from './water.js';

/* ---------------- peso ---------------- */

export function weightSheet({ date = todayISO(), entry = null, onDone } = {}) {
  const editing = !!entry;
  const body = `
    <div class="form-grid">
      ${field({
        label: 'Peso (kg)', name: 'kg', inputmode: 'decimal', placeholder: 'ex.: 82,4',
        value: entry ? String(entry.kg).replace('.', ',') : '', required: true,
      })}
      ${field({ label: 'Data', name: 'date', type: 'date', value: entry?.date || date, required: true })}
      ${field({
        label: 'Como você está?', name: 'note', span2: true, placeholder: 'opcional',
        value: entry?.note || '',
      })}
      ${photoInput('photo')}
      ${editing ? `<button type="button" class="btn btn-danger btn-block" data-delete>${icon('trash', 17)} Excluir registro</button>` : ''}
    </div>`;

  openSheet({
    title: editing ? 'Editar peso' : 'Registrar peso',
    submitLabel: editing ? 'Salvar' : 'Registrar',
    body,
    onMount: (form, api) => {
      wirePhotoPreview(form);
      form.querySelector('[data-delete]')?.addEventListener('click', async () => {
        const ok = await confirmSheet({
          title: 'Excluir registro',
          message: 'Este registro de peso será apagado. Não dá para desfazer.',
          confirmLabel: 'Excluir',
        });
        if (!ok) return;
        await db.remove('weights', entry.id);
        toast('Registro excluído');
        onDone?.();
      });
    },
    onSubmit: async (form) => {
      const kg = num(form, 'kg');
      const day = str(form, 'date') || todayISO();
      if (!kg || kg < 25 || kg > 400) throw new Error('Informe um peso entre 25 e 400 kg.');

      let photoId = entry?.photoId || null;
      const file = form.elements.photo?.files?.[0];
      if (file) {
        const { blob } = await compressImage(file, 1400, 0.78);
        const photo = await db.savePhoto(blob, { date: day, kind: 'weight' });
        photoId = photo.id;
      }

      const existing = editing ? null : (await db.byDate('weights', day))[0];
      const record = {
        ...(entry || existing || {}),
        id: entry?.id || existing?.id,
        date: day,
        kg,
        note: str(form, 'note'),
        photoId,
        createdAt: entry?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.put('weights', record);
      toast(existing ? 'Peso do dia atualizado' : 'Peso registrado');
      onDone?.();
    },
  });
}

/* ---------------- água ---------------- */

export function waterSheet({ date = todayISO(), current = 0, onDone } = {}) {
  openSheet({
    title: 'Água',
    submitLabel: 'Adicionar',
    body: `
      <p class="small muted" style="margin:0">
        Hoje: <b>${fmtNum(current / 1000, 2)} L</b>. Some um copo ou defina o total do dia.
      </p>
      <div class="grid-3">
        ${[200, 250, 350].map((ml) => `<button type="button" class="btn btn-soft water" data-add="${ml}">+${ml} ml</button>`).join('')}
      </div>
      <div class="form-grid">
        ${field({ label: 'Quantidade (ml)', name: 'ml', inputmode: 'numeric', value: 250 })}
        ${selectField({
          label: 'Ação', name: 'mode',
          options: [{ value: 'add', label: 'Adicionar' }, { value: 'set', label: 'Definir total' }],
        })}
      </div>`,
    onMount: (form, api) => {
      form.querySelectorAll('[data-add]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const total = Number(current) + Number(btn.dataset.add);
          await setWater(total, date);
          api.close();
          onDone?.(total);
        });
      });
    },
    onSubmit: async (form) => {
      const value = num(form, 'ml', 0);
      if (!value || value <= 0) throw new Error('Informe uma quantidade.');
      const total = str(form, 'mode') === 'set' ? value : Number(current) + value;
      await setWater(total, date);
      onDone?.(total);
    },
  });
}

/* ---------------- refeição ---------------- */

export function mealSheet({ date = todayISO(), meal = null, onDone } = {}) {
  const editing = !!meal;
  const body = `
    <div class="field">
      <label for="meal-text">O que você comeu?</label>
      <textarea name="text" id="meal-text" rows="3" placeholder="ex.: 2 ovos mexidos, 1 pão integral, café com leite">${esc(meal?.text || '')}</textarea>
    </div>
    ${photoInput('photo')}
    <button type="button" class="btn btn-soft" data-ai>${icon('sparkles', 17)} Analisar com IA</button>
    <div data-ai-status>${meal?.comment ? `<div class="insight">${esc(meal.comment)}</div>` : ''}</div>
    <div class="form-grid">
      ${field({ label: 'Calorias (kcal)', name: 'kcal', inputmode: 'numeric', value: meal?.kcal ?? '' })}
      ${field({ label: 'Proteína (g)', name: 'protein', inputmode: 'decimal', value: meal?.protein ?? '' })}
      ${field({ label: 'Carboidratos (g)', name: 'carbs', inputmode: 'decimal', value: meal?.carbs ?? '' })}
      ${field({ label: 'Gordura (g)', name: 'fat', inputmode: 'decimal', value: meal?.fat ?? '' })}
      ${field({ label: 'Horário', name: 'time', type: 'time', value: meal?.time || nowHM() })}
      <input type="hidden" name="comment" value="${esc(meal?.comment || '')}">
      <input type="hidden" name="confidence" value="${esc(meal?.confidence || '')}">
    </div>
    ${editing ? `<button type="button" class="btn btn-danger btn-block" data-delete>${icon('trash', 17)} Excluir refeição</button>` : ''}`;

  openSheet({
    title: editing ? 'Editar refeição' : 'Nova refeição',
    submitLabel: editing ? 'Salvar' : 'Registrar',
    body,
    onMount: (form, api) => {
      wirePhotoPreview(form);
      const btn = form.querySelector('[data-ai]');
      const status = form.querySelector('[data-ai-status]');
      const btnLabel = btn.innerHTML;

      btn.addEventListener('click', async () => {
        const text = str(form, 'text');
        const file = form.elements.photo?.files?.[0];
        if (!text && !file) return toast('Escreva ou tire uma foto primeiro.', 'error');
        if (!state.settings.gemini?.key) {
          toast('Configure a chave do Gemini nos ajustes.', 'error');
          return;
        }

        btn.disabled = true;
        btn.innerHTML = `<span class="spin" style="display:inline-flex">${icon('activity', 17)}</span> Analisando`;
        status.innerHTML = '<p class="tiny muted" style="margin:0">Estimando porções e macros…</p>';

        try {
          let prepared = form._photo;
          if (file && !prepared) {
            prepared = await compressImage(file);
            form._photo = prepared;
          }
          form._thumb = form._thumb || (file ? await thumbnail(file) : null);

          const result = await analyzeMeal({ text, imageBlob: prepared?.blob || null });
          form.elements.kcal.value = result.kcal || '';
          form.elements.protein.value = result.protein || '';
          form.elements.carbs.value = result.carbs || '';
          form.elements.fat.value = result.fat || '';
          form.elements.comment.value = result.comment || '';
          form.elements.confidence.value = result.confidence || '';

          status.innerHTML = `
            ${result.comment ? `<div class="insight">${esc(result.comment)}</div>` : ''}
            ${result.items?.length ? `<div class="list" style="margin-top:10px">${result.items.map((it) => `
              <div class="list-item" style="padding:8px 0">
                <div class="li-main"><div class="li-title">${esc(it.name)}</div></div>
                <div class="li-end">${fmtNum(it.kcal)} kcal · ${fmtNum(it.protein, 0)} g</div>
              </div>`).join('')}</div>` : ''}
            <p class="tiny muted" style="margin:8px 0 0">Confiança ${esc(result.confidence)} · ajuste os valores se precisar.</p>`;
        } catch (err) {
          status.innerHTML = `<div class="insight warn">${esc(err.message)}</div>`;
        } finally {
          btn.disabled = false;
          btn.innerHTML = btnLabel;
        }
      });

      form.querySelector('[data-delete]')?.addEventListener('click', async () => {
        const ok = await confirmSheet({
          title: 'Excluir refeição',
          message: 'A refeição e a foto dela serão apagadas.',
          confirmLabel: 'Excluir',
        });
        if (!ok) return;
        await db.remove('meals', meal.id);
        if (meal.photoId) await db.remove('photos', meal.photoId);
        toast('Refeição excluída');
        onDone?.();
      });
    },
    onSubmit: async (form) => {
      const text = str(form, 'text');
      const kcal = num(form, 'kcal', 0);
      const file = form.elements.photo?.files?.[0];
      if (!text && !file && !kcal) throw new Error('Descreva a refeição ou informe as calorias.');

      let photoId = meal?.photoId || null;
      let thumb = meal?.thumb || null;
      if (file) {
        const prepared = form._photo || await compressImage(file);
        const saved = await db.savePhoto(prepared.blob, { date, kind: 'meal' });
        photoId = saved.id;
        thumb = form._thumb || await thumbnail(file);
      }

      await db.put('meals', {
        ...(meal || {}),
        id: meal?.id,
        date,
        time: str(form, 'time') || nowHM(),
        text,
        kcal: Math.round(kcal),
        protein: num(form, 'protein', 0),
        carbs: num(form, 'carbs', 0),
        fat: num(form, 'fat', 0),
        comment: str(form, 'comment'),
        confidence: str(form, 'confidence'),
        photoId,
        thumb,
        createdAt: meal?.createdAt || new Date().toISOString(),
      });
      toast('Refeição registrada');
      onDone?.();
    },
  });
}

/* ---------------- aplicação ---------------- */

export function injectionSheet({ injection = null, onDone } = {}) {
  const cfg = state.settings.injection || {};
  const sites = cfg.sites?.length ? cfg.sites : ['abdômen D', 'abdômen E', 'coxa D', 'coxa E'];

  db.all('injections').then((rows) => {
    const next = nextInjection(state.settings, rows);
    const editing = !!injection;
    const siteValue = injection?.site || next?.site || sites[0];
    const allSites = [...new Set([...sites, siteValue])].filter(Boolean);

    openSheet({
      title: editing ? 'Editar aplicação' : 'Registrar aplicação',
      submitLabel: editing ? 'Salvar' : 'Registrar',
      body: `
        <div class="form-grid">
          ${field({ label: 'Data', name: 'date', type: 'date', value: injection?.date || todayISO(), required: true })}
          ${field({ label: 'Dose', name: 'dose', inputmode: 'decimal', placeholder: cfg.unit || 'mg', value: injection?.dose ?? cfg.dose ?? '' })}
          ${selectField({ label: 'Local', name: 'site', value: siteValue, options: allSites, span2: true, hint: 'O rodízio evita irritação no mesmo ponto.' })}
          ${field({ label: 'Observação', name: 'note', span2: true, value: injection?.note || '', placeholder: 'opcional' })}
          ${editing ? `<button type="button" class="btn btn-danger btn-block" data-delete>${icon('trash', 17)} Excluir</button>` : ''}
        </div>`,
      onMount: (form) => {
        form.querySelector('[data-delete]')?.addEventListener('click', async () => {
          const ok = await confirmSheet({
            title: 'Excluir aplicação',
            message: 'O registro será apagado.',
            confirmLabel: 'Excluir',
          });
          if (!ok) return;
          await db.remove('injections', injection.id);
          toast('Registro excluído');
          onDone?.();
        });
      },
      onSubmit: async (form) => {
        const day = str(form, 'date') || todayISO();
        await db.put('injections', {
          ...(injection || {}),
          id: injection?.id,
          date: day,
          dose: str(form, 'dose'),
          site: str(form, 'site'),
          note: str(form, 'note'),
          createdAt: injection?.createdAt || new Date().toISOString(),
        });
        toast('Aplicação registrada');
        onDone?.();
      },
    });
  });
}

/* ---------------- sintomas ---------------- */

const SCALE = [
  { key: 'nausea', label: 'Náusea', low: 'nenhuma', high: 'intensa' },
  { key: 'constipation', label: 'Prisão de ventre', low: 'nenhuma', high: 'intensa' },
  { key: 'fatigue', label: 'Cansaço', low: 'nenhum', high: 'muito' },
  { key: 'appetite', label: 'Apetite', low: 'nenhum', high: 'muito' },
];

export function symptomSheet({ date = todayISO(), entry = null, onDone } = {}) {
  const values = entry || {};
  const rows = SCALE.map((s) => `
    <div class="field" data-scale="${s.key}">
      <div class="row">
        <label>${s.label}</label>
        <span class="chip accent" data-out="${s.key}">${values[s.key] ?? 0}</span>
      </div>
      <input type="range" min="0" max="5" step="1" name="${s.key}" value="${values[s.key] ?? 0}">
      <div class="row tiny muted" style="margin-top:-2px"><span>${s.low}</span><span>${s.high}</span></div>
    </div>`).join('');

  openSheet({
    title: 'Como você está?',
    submitLabel: 'Salvar',
    body: `
      <p class="small muted" style="margin:0">Uma nota de 0 a 5. Serve para você e para levar ao médico.</p>
      <div class="stack" style="gap:16px">${rows}</div>
      ${field({ label: 'Observação', name: 'note', type: 'textarea', value: entry?.note || '', placeholder: 'algo que queira lembrar', rows: 2 })}
    `,
    onMount: (form) => {
      form.querySelectorAll('[data-scale]').forEach((wrap) => {
        const key = wrap.dataset.scale;
        const input = wrap.querySelector('input[type="range"]');
        const out = wrap.querySelector(`[data-out="${key}"]`);
        input.addEventListener('input', () => { out.textContent = input.value; });
      });
    },
    onSubmit: async (form) => {
      const payload = { date, note: str(form, 'note'), createdAt: entry?.createdAt || new Date().toISOString() };
      for (const s of SCALE) payload[s.key] = num(form, s.key, 0);
      const existing = entry || (await db.byDate('symptoms', date))[0];
      if (existing) payload.id = existing.id;
      await db.put('symptoms', payload);
      toast('Registro salvo');
      onDone?.();
    },
  });
}
