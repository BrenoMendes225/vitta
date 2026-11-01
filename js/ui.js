/* Componentes de interface: folhas (bottom sheets), toasts, campos e formatação. */

import { icon } from './icons.js';
import { state } from './store.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => (
    c === '&' ? '&' + 'amp;' :
    c === '<' ? '&' + 'lt;' :
    c === '>' ? '&' + 'gt;' :
    c === '"' ? '&' + 'quot;' :
    '&#' + '39;'
  ));
}

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export function fmtNum(value, dec = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export const fmtKg = (v) => fmtNum(v, 1);

export function fmtWeight(v) {
  const units = state.settings?.units || 'metric';
  if (!Number.isFinite(Number(v))) return '—';
  const n = Number(v);
  if (units === 'imperial') {
    return fmtNum(n * 2.20462, 1);
  }
  return fmtNum(n, 1);
}
export function weightUnitLabel() {
  return (state.settings?.units || 'metric') === 'imperial' ? 'lb' : 'kg';
}

export function fmtHeight(cm) {
  const units = state.settings?.units || 'metric';
  if (!Number.isFinite(Number(cm))) return '—';
  const n = Number(cm);
  if (units === 'imperial') {
    const inches = n * 0.393701;
    return fmtNum(inches, 0);
  }
  return fmtNum(n, 0);
}
export function heightUnitLabel() {
  return (state.settings?.units || 'metric') === 'imperial' ? 'in' : 'cm';
}

export function fmtL(ml) {
  return fmtNum(Number(ml) / 1000, 2);
}

export function fmtVol(ml) {
  const n = Number(ml) / 1000;
  return Number.isFinite(n)
    ? n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
    : '—';
}
export const fmtKcal = (v) => (v == null ? '—' : fmtNum(v, 0));

export function num(form, name, fallback = null) {
  const raw = form.elements[name]?.value;
  if (raw == null || raw === '') return fallback;
  const n = Number(String(raw).replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

export function str(form, name, fallback = '') {
  const raw = form.elements[name]?.value;
  return raw == null ? fallback : String(raw).trim();
}

export function signed(v, dec = 1) {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  const n = Number(v);
  if (Math.abs(n) < Math.pow(10, -dec) / 2) return (0).toFixed(dec).replace('.', ',');
  return `${n > 0 ? '+' : '−'}${Math.abs(n).toFixed(dec).replace('.', ',')}`;
}

/* ---------- toast ---------- */

export function toast(message, kind = 'ok') {
  const tt = document.getElementById('tt');
  if (!tt) return;
  tt.textContent = message;
  tt.classList.add('on');
  setTimeout(() => tt.classList.remove('on'), 2200);
}

/* ---------- bottom sheet (novo sistema com #sh / #bd) ---------- */

let activeSheet = null;

export function closeSheet() {
  const sheet = activeSheet;
  activeSheet = null;
  document.body.classList.remove('so');
  sheet?.onClose?.();
}

export function openSheet({
  title,
  body = '',
  submitLabel = 'Salvar',
  cancelLabel = 'Cancelar',
  onSubmit,
  onMount,
  onClose,
  danger = false,
  hideSubmit = false,
  hideCancel = false,
}) {
  closeSheet();

  const submitHtml = hideSubmit
    ? ''
    : `<button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" type="submit">${esc(submitLabel)}</button>`;
  const cancelHtml = hideCancel
    ? ''
    : `<button class="btn btn-sec" type="button" data-close>${esc(cancelLabel)}</button>`;

  const html = `
    <div class="sheet-head">
      <h2>${esc(title)}</h2>
      <button class="icon-btn bare" type="button" data-close aria-label="Fechar">${icon('x', 18, 2)}</button>
    </div>
    <form class="sheet-body" novalidate>
      ${body}
      ${hideSubmit && hideCancel ? '' : `<div class="sheet-foot">${cancelHtml}${submitHtml}</div>`}
    </form>`;

  const sh = document.getElementById('sh');
  sh.innerHTML = '<div class="grab"></div>' + html;
  document.body.classList.add('so');

  const form = sh.querySelector('form');
  const api = {
    form,
    backdrop: sh,
    close: closeSheet,
    onClose,
    setLoading(on) {
      const btn = form.querySelector('button[type="submit"]');
      if (!btn) return;
      btn.disabled = on;
      if (on) {
        btn.dataset.label = btn.innerHTML;
        btn.innerHTML = `<span class="spin" style="display:inline-flex">${icon('activity', 17, 2.2)}</span>`;
      } else if (btn.dataset.label) {
        btn.innerHTML = btn.dataset.label;
      }
    },
  };

  activeSheet = api;

  // delegação: um único listener no #sh, ligado uma vez
  if (!sh.dataset.wired) {
    sh.dataset.wired = '1';
    sh.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) {
        e.preventDefault();
        closeSheet();
      }
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!onSubmit) return closeSheet();
    api.setLoading(true);
    try {
      const result = await onSubmit(form, api);
      if (result === false) {
        api.setLoading(false);
        return;
      }
      closeSheet();
    } catch (err) {
      console.error(err);
      api.setLoading(false);
      toast(err?.message || 'Não foi possível salvar.', 'error');
    }
  });

  onMount?.(form, api);

  return api;
}

export function confirmSheet({
  title = 'Confirmar',
  message = '',
  confirmLabel = 'Confirmar',
  danger = true,
}) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (value) => {
      if (done) return;
      done = true;
      resolve(value);
    };
    openSheet({
      title,
      submitLabel: confirmLabel,
      danger,
      body: `<p class="small" style="margin:0;line-height:1.55">${esc(message)}</p>`,
      onSubmit: () => finish(true),
      onClose: () => finish(false),
    });
  });
}

/* ---------- campos ---------- */

export function field({
  label,
  name,
  type = 'text',
  value = '',
  placeholder = '',
  inputmode,
  step,
  min,
  max,
  required = false,
  hint = '',
  span2 = false,
  rows,
  autocomplete = 'off',
  disabled = false,
}) {
  const common = [
    `name="${esc(name)}"`,
    `id="f-${esc(name)}"`,
    value !== '' && value != null ? `value="${esc(value)}"` : '',
    placeholder ? `placeholder="${esc(placeholder)}"` : '',
    inputmode ? `inputmode="${esc(inputmode)}"` : '',
    step != null ? `step="${esc(step)}"` : '',
    min != null ? `min="${esc(min)}"` : '',
    max != null ? `max="${esc(max)}"` : '',
    required ? 'required' : '',
    disabled ? 'disabled' : '',
    `autocomplete="${esc(autocomplete)}"`,
  ].filter(Boolean).join(' ');

  const control = type === 'textarea'
    ? `<textarea ${common} rows="${rows || 3}">${esc(value)}</textarea>`
    : `<input ${common} type="${esc(type)}">`;

  return `<div class="field ${span2 ? 'span-2' : ''}">
    <label for="f-${esc(name)}">${esc(label)}</label>
    ${control}
    ${hint ? `<span class="hint">${hint}</span>` : ''}
  </div>`;
}

export function selectField({ label, name, value = '', options = [], hint = '', span2 = false }) {
  const opts = options.map((o) => {
    const val = typeof o === 'string' ? o : o.value;
    const text = typeof o === 'string' ? o : o.label;
    return `<option value="${esc(val)}"${String(val) === String(value) ? ' selected' : ''}>${esc(text)}</option>`;
  }).join('');
  return `<div class="field ${span2 ? 'span-2' : ''}">
    <label for="f-${esc(name)}">${esc(label)}</label>
    <select name="${esc(name)}" id="f-${esc(name)}">${opts}</select>
    ${hint ? `<span class="hint">${hint}</span>` : ''}
  </div>`;
}

export function segmented({ name, value, options, small = false }) {
  return `<div class="seg" data-seg="${esc(name)}" role="tablist">
    ${options.map((o) => {
      const val = typeof o === 'string' ? o : o.value;
      const text = typeof o === 'string' ? o : o.label;
      return `<button type="button" role="tab" data-value="${esc(val)}" class="${String(val) === String(value) ? 'on' : ''}"${small ? ' style="padding:6px 4px;font-size:12.5px"' : ''}>${esc(text)}</button>`;
    }).join('')}
  </div>`;
}

export function bindSegmented(root, onChange) {
  $$('[data-seg]', root).forEach((seg) => {
    seg.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-value]');
      if (!btn) return;
      $$('button', seg).forEach((b) => b.classList.toggle('on', b === btn));
      onChange?.(seg.dataset.seg, btn.dataset.value);
    });
  });
}

/* ---------- pedaços visuais ---------- */

export function progressBar(value, max, variant = '') {
  const pct = max > 0 ? clamp((value / max) * 100, 0, 100) : 0;
  const over = max > 0 && value > max * 1.08;
  return `<div class="bar ${variant} ${over ? 'over' : ''}"><i style="width:${pct.toFixed(1)}%"></i></div>`;
}

export function emptyState(text, actionHtml = '') {
  return `<div class="empty">${text}${actionHtml ? `<div style="margin-top:12px">${actionHtml}</div>` : ''}</div>`;
}

export function photoInput(name = 'photo') {
  return `<div class="field span-2">
    <label>Foto</label>
    <input type="file" name="${esc(name)}" accept="image/*" id="photo-${esc(name)}" hidden>
    <label for="photo-${esc(name)}" class="btn btn-sec" style="width:100%">${icon('camera', 18)} Escolher / tirar foto</label>
    <div class="photo-preview hidden" data-preview="${esc(name)}"></div>
    <span class="hint">A foto fica só no seu aparelho.</span>
  </div>`;
}

export function wirePhotoPreview(form, name = 'photo') {
  const input = form.elements[name];
  const box = form.querySelector(`[data-preview="${name}"]`);
  if (!input || !box) return;
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    box.innerHTML = '';
    box.classList.toggle('hidden', !file);
    if (!file) return;
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.style.cssText = 'width:100%;border-radius:14px;display:block;max-height:240px;object-fit:cover;margin-top:8px';
    box.appendChild(img);
  });
}