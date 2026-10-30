/* Fotos de progresso — galeria e comparador antes/depois. */

import { icon } from '../icons.js';
import { fmtNum, esc, emptyState, openSheet, toast, confirmSheet, selectField } from '../ui.js';
import * as db from '../db.js';
import { fmtShort, humanDate, fmtLong } from '../date.js';
import { compareSlider, wireCompareSlider } from '../charts.js';
import { refresh, back } from '../router.js';

let urls = [];

export default async function photosScreen(view) {
  urls.forEach((u) => URL.revokeObjectURL(u));
  urls = [];

  const all = (await db.all('photos')).filter((p) => p.kind === 'weight');
  const photos = all.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const withURL = photos.map((p) => {
    const url = URL.createObjectURL(p.blob);
    urls.push(url);
    return { ...p, url };
  });

  const latest = withURL[0];
  const oldest = withURL[withURL.length - 1];

  view.innerHTML = `
    <header class="page-head">
      <div style="display:flex;align-items:center;gap:10px">
        <button class="icon-btn bare" data-back aria-label="Voltar">${icon('left', 20)}</button>
        <div>
          <p class="eyebrow">Progresso</p>
          <h1>Fotos</h1>
        </div>
      </div>
      <button class="icon-btn" data-add aria-label="Adicionar foto">${icon('plus', 20)}</button>
    </header>

    <div class="stack">
      ${withURL.length >= 2 ? `
        <section class="card">
          <p class="card-title">${icon('share', 16)} Antes e depois</p>
          <div class="form-grid" style="gap:8px;margin-bottom:12px">
            ${selectField({ label: 'Antes', name: 'before', value: oldest.id, options: withURL.map((p) => ({ value: p.id, label: fmtShort(p.date) })) })}
            ${selectField({ label: 'Depois', name: 'after', value: latest.id, options: withURL.map((p) => ({ value: p.id, label: fmtShort(p.date) })) })}
          </div>
          <div data-compare-wrap>
            ${compareSlider({
              beforeURL: oldest.url,
              afterURL: latest.url,
              beforeLabel: fmtShort(oldest.date),
              afterLabel: fmtShort(latest.date),
            })}
          </div>
          <p class="tiny muted" style="margin:8px 0 0">Arraste a linha para comparar.</p>
        </section>` : ''}

      ${withURL.length
        ? `<section class="card tight">
            <div class="row" style="margin-bottom:10px">
              <p class="card-title" style="margin:0">${icon('photo', 16)} Galeria</p>
              <span class="tiny muted">${withURL.length} foto${withURL.length > 1 ? 's' : ''}</span>
            </div>
            <div class="photos">
              ${withURL.map((p) => `<button class="photo-thumb" data-photo="${p.id}">
                <img src="${p.url}" alt="Foto de ${humanDate(p.date)}" loading="lazy">
                <span class="cap">${fmtShort(p.date)}</span>
              </button>`).join('')}
            </div>
          </section>`
        : `<section class="card">${emptyState(
          'Tire uma foto agora para ter um “antes” guardado.<br>O espelho engana, a foto não.',
          `<button class="btn btn-primary" data-add>Adicionar foto</button>`,
        )}</section>`}

      <p class="disclaimer">As fotos ficam apenas neste aparelho. Use boa luz, mesma pose e mesmo horário para comparar melhor.</p>
    </div>`;

  view.querySelector('[data-back]')?.addEventListener('click', () => back('peso'));
  view.querySelectorAll('[data-add]').forEach((el) => el.addEventListener('click', () => addPhoto()));

  wireCompareSlider(view);

  const [beforeSel, afterSel] = view.querySelectorAll('select');
  const redraw = () => {
    const before = withURL.find((p) => p.id === beforeSel.value);
    const after = withURL.find((p) => p.id === afterSel.value);
    if (!before || !after) return;
    view.querySelector('[data-compare-wrap]').innerHTML = compareSlider({
      beforeURL: before.url,
      afterURL: after.url,
      beforeLabel: fmtShort(before.date),
      afterLabel: fmtShort(after.date),
    });
    wireCompareSlider(view);
  };
  beforeSel?.addEventListener('change', redraw);
  afterSel?.addEventListener('change', redraw);

  view.querySelectorAll('[data-photo]').forEach((el) => {
    el.addEventListener('click', () => {
      const photo = withURL.find((p) => p.id === el.dataset.photo);
      if (photo) viewPhoto(photo);
    });
  });
}

function viewPhoto(photo) {
  openSheet({
    title: fmtLong(photo.date),
    hideSubmit: true,
    hideCancel: true,
    body: `
      <div class="meal-photo"><img src="${photo.url}" alt="Foto de ${humanDate(photo.date)}"></div>
      <p class="small muted" style="margin:0">${humanDate(photo.date)}</p>
      <button class="btn btn-danger btn-block" data-del>${icon('trash', 17)} Excluir foto</button>`,
    onMount: (form, sheet) => {
      sheet.backdrop.querySelector('[data-del]').addEventListener('click', async () => {
        const ok = await confirmSheet({
          title: 'Excluir foto',
          message: 'A foto será apagada deste aparelho.',
          confirmLabel: 'Excluir',
        });
        if (!ok) return;
        await db.remove('photos', photo.id);
        sheet.close();
        toast('Foto excluída');
        setTimeout(() => refresh({ keepScroll: true }), 260);
      });
    },
  });
}

function addPhoto() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    toast('Salvando foto…');
    const { compressImage } = await import('../image.js');
    const { blob } = await compressImage(file, 1600, 0.8);
    await db.savePhoto(blob, { kind: 'weight', date: new Date().toISOString().slice(0, 10) });
    toast('Foto adicionada');
    refresh({ keepScroll: true });
  });
  input.click();
}
