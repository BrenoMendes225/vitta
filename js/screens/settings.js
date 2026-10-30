/* Tela Ajustes — perfil, metas, medicamento, IA e dados. */

import { state, saveSettings, loadSettings, loadSettings as reload, APP } from '../store.js';
import { icon } from '../icons.js';
import { field, selectField, str, num, toast, esc, confirmSheet, openSheet } from '../ui.js';
import * as db from '../db.js';
import { todayISO } from '../date.js';
import { testKey } from '../gemini.js';
import { refresh, back, go } from '../router.js';

const MODELS = [
  { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash (recomendado)' },
  { value: 'gemini-2.5-flash-lite', label: 'gemini-2.5-flash-lite (mais barato)' },
  { value: 'gemini-2.0-flash', label: 'gemini-2.0-flash' },
  { value: 'gemini-2.5-pro', label: 'gemini-2.5-pro (mais preciso)' },
];

export default async function settingsScreen(view) {
  const st = state.settings;
  const inj = st.injection || {};
  const gem = st.gemini || {};
  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  view.innerHTML = `
    <header class="page-head">
      <div style="display:flex;align-items:center;gap:10px">
        <button class="icon-btn bare" data-back aria-label="Voltar">${icon('left', 20)}</button>
        <div>
          <p class="eyebrow">App</p>
          <h1>Ajustes</h1>
        </div>
      </div>
      <button class="btn btn-sm btn-primary" type="submit" form="settings-form">Salvar</button>
    </header>

    <form id="settings-form" class="stack" novalidate>

      <section class="card">
        <p class="card-title">${icon('user', 16)} Perfil</p>
        <div class="form-grid">
          ${field({ label: 'Nome', name: 'name', value: st.name || '', placeholder: 'como quer ser chamado' })}
          ${field({ label: 'Nascimento', name: 'birthDate', type: 'date', value: st.birthDate || '' })}
          ${field({ label: 'Altura (cm)', name: 'height', inputmode: 'numeric', value: st.height ?? '' })}
          ${field({ label: 'Peso inicial (kg)', name: 'startWeight', inputmode: 'decimal', value: st.startWeight ?? '' })}
          ${field({ label: 'Meta de peso (kg)', name: 'goalWeight', inputmode: 'decimal', value: st.goalWeight ?? '' })}
        </div>
      </section>

      <section class="card">
        <p class="card-title">${icon('target', 16)} Metas diárias</p>
        <div class="form-grid">
          ${field({ label: 'Proteína (g)', name: 'proteinGoal', inputmode: 'numeric', value: st.proteinGoal ?? 120, hint: 'Ajuda a preservar massa muscular.' })}
          ${field({ label: 'Água (ml)', name: 'waterGoal', inputmode: 'numeric', value: st.waterGoal ?? 2500 })}
          ${field({ label: 'Calorias (kcal)', name: 'kcalGoal', inputmode: 'numeric', value: st.kcalGoal ?? '', hint: 'Opcional. Fica só como referência, sem cobrança.', span2: true })}
        </div>
      </section>

      <section class="card">
        <p class="card-title">${icon('syringe', 16)} Aplicação</p>
        <div class="form-grid">
          ${field({ label: 'Medicamento', name: 'injName', value: inj.name || '', placeholder: 'ex.: Wegovy', span2: true })}
          ${field({ label: 'Dose', name: 'injDose', value: inj.dose || '', placeholder: 'ex.: 0,5' })}
          ${selectField({ label: 'Unidade', name: 'injUnit', value: inj.unit || 'mg', options: ['mg', 'ml', 'UI', 'mcg'] })}
          ${field({ label: 'A cada (dias)', name: 'injInterval', inputmode: 'numeric', value: inj.intervalDays ?? 7 })}
          ${field({ label: 'Início / 1ª dose', name: 'injStart', type: 'date', value: inj.startDate || '' })}
          ${field({
            label: 'Locais de aplicação', name: 'injSites', span2: true,
            value: (inj.sites || []).join(', '),
            hint: 'Separe por vírgula. O app alterna nesta ordem.',
          })}
        </div>
      </section>

      <section class="card">
        <p class="card-title">${icon('sparkles', 16)} Inteligência artificial</p>
        <div class="form-grid">
          ${field({
            label: 'Chave da API do Gemini', name: 'geminiKey', type: 'password', value: gem?.key || 'AQ.Ab8RN6Jdz64la2kKSfGPZa752Ke9XYEX6OepRgPfqyC9EbOG7w',
            span2: true, hint: 'Fica só neste aparelho. Crie em aistudio.google.com/apikey.',
            autocomplete: 'new-password',
          })}
          ${selectField({ label: 'Modelo', name: 'geminiModel', value: gem?.model || 'gemini-2.5-flash', options: MODELS, span2: true })}
        </div>
        <button type="button" class="btn btn-soft btn-block" data-test style="margin-top:12px">${icon('activity', 17)} Testar conexão</button>
        <div data-test-status style="margin-top:10px"></div>
      </section>

      <section class="card">
        <p class="card-title">${icon('lock', 16)} Seus dados</p>
        <p class="small muted" style="margin:0 0 14px">
          Tudo fica no armazenamento deste aparelho. Faça backup antes de trocar de iPhone ou limpar o Safari.
        </p>
        <div class="stack" style="gap:10px">
          <button type="button" class="btn btn-ghost btn-block" data-export>${icon('download', 17)} Exportar backup (.json)</button>
          <button type="button" class="btn btn-ghost btn-block" data-import>${icon('upload', 17)} Importar backup</button>
          <input type="file" accept="application/json,.json" data-import-file hidden>
          <button type="button" class="btn btn-danger btn-block" data-wipe>${icon('trash', 17)} Apagar todos os dados</button>
        </div>
      </section>

      ${standalone ? '' : `<section class="card">
        <p class="card-title">${icon('share', 16)} Instalar no iPhone</p>
        <ol class="small muted" style="margin:0;padding-left:18px;line-height:1.7">
          <li>Abra este endereço no <b>Safari</b>.</li>
          <li>Toque em <b>Compartilhar</b> (quadrado com a flecha).</li>
          <li>Escolha <b>Adicionar à Tela de Início</b>.</li>
        </ol>
        <p class="tiny muted" style="margin:10px 0 0">Só assim ele abre em tela cheia e funciona offline.</p>
      </section>`}

      <p class="disclaimer">
        ${APP.name} ${APP.version} · ${APP.tagline}<br>
        Este app não substitui médico ou nutricionista.
      </p>
    </form>`;

  const form = view.querySelector('#settings-form');

  view.querySelector('[data-back]')?.addEventListener('click', () => back('mais'));

  const collect = () => ({
    name: str(form, 'name'),
    birthDate: str(form, 'birthDate'),
    height: num(form, 'height'),
    startWeight: num(form, 'startWeight'),
    goalWeight: num(form, 'goalWeight'),
    proteinGoal: num(form, 'proteinGoal', 0),
    waterGoal: num(form, 'waterGoal', 0),
    kcalGoal: num(form, 'kcalGoal'),
    injection: {
      name: str(form, 'injName'),
      dose: str(form, 'injDose'),
      unit: str(form, 'injUnit'),
      intervalDays: num(form, 'injInterval', 7),
      startDate: str(form, 'injStart'),
      sites: str(form, 'injSites').split(',').map((s) => s.trim()).filter(Boolean),
    },
    gemini: {
      key: str(form, 'geminiKey'),
      model: str(form, 'geminiModel') || 'gemini-2.5-flash',
    },
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveSettings(collect());
    toast('Ajustes salvos');
    refresh({ keepScroll: true });
  });

  view.querySelector('[data-test]')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const status = view.querySelector('[data-test-status]');
    btn.disabled = true;
    status.innerHTML = '<p class="tiny muted" style="margin:0">Testando…</p>';
    try {
      await saveSettings(collect());
      const reply = await testKey();
      status.innerHTML = `<div class="insight">Conectado. A IA respondeu: "${esc(reply.slice(0, 60))}"</div>`;
    } catch (err) {
      status.innerHTML = `<div class="insight warn">${esc(err.message)}</div>`;
    } finally {
      btn.disabled = false;
    }
  });

  view.querySelector('[data-export]')?.addEventListener('click', async () => {
    const data = await db.exportAll();
    const name = `vitta-backup-${todayISO()}.json`;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const file = new File([blob], name, { type: 'application/json' });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Backup do Vitta' });
        return;
      }
    } catch { /* segue para download */ }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast('Backup gerado');
  });

  const fileInput = view.querySelector('[data-import-file]');
  view.querySelector('[data-import]')?.addEventListener('click', () => fileInput.click());

  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const ok = await confirmSheet({
        title: 'Importar backup',
        message: 'Os dados atuais serão substituídos pelos do arquivo. Fotos não entram no backup.',
        confirmLabel: 'Importar',
        danger: true,
      });
      if (!ok) return;
      const total = await db.importAll(data, { replace: true });
      await reload();
      toast(`${total} registros importados`);
      refresh();
    } catch (err) {
      toast(err.message || 'Arquivo inválido', 'error');
    } finally {
      fileInput.value = '';
    }
  });

  view.querySelector('[data-wipe]')?.addEventListener('click', async () => {
    const ok = await confirmSheet({
      title: 'Apagar tudo',
      message: 'Todos os registros, fotos e ajustes serão apagados deste aparelho. Não há como desfazer.',
      confirmLabel: 'Apagar tudo',
    });
    if (!ok) return;
    await db.wipe();
    await loadSettings();
    location.hash = '#/bemvindo';
    refresh();
  });
}