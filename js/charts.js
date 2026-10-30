/* Gráficos em SVG, sem bibliotecas. Coordenadas fixas com escala responsiva. */

import { fmtNum } from './ui.js';
import { fmtShort } from './date.js';

const NS = 'http://www.w3.org/2000/svg';

function scale(values, { min, max }) {
  const lo = Math.min(...values, min ?? Infinity);
  const hi = Math.max(...values, max ?? -Infinity);
  const pad = (hi - lo || 1) * 0.14;
  return { lo: lo - pad, hi: hi + pad };
}

/**
 * Gráfico de linha com média móvel.
 * @param {{points: {date: string, value: number, ma?: number}[], goal?: number|null, height?: number}} opts
 */
export function lineChart({ points = [], goal = null, height = 190, showRaw = true }) {
  const W = 360;
  const H = height;
  const pad = { l: 38, r: 10, t: 14, b: 30 };
  const hasGoal = Number.isFinite(goal) && goal > 0;

  if (points.length === 0) {
    return `<div class="empty">Sem registros no período.</div>`;
  }

  const values = points.map((p) => p.value);
  const range = scale(hasGoal ? [...values, goal] : values, {});
  const x = (i) => pad.l + (i / Math.max(points.length - 1, 1)) * (W - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - range.lo) / (range.hi - range.lo)) * (H - pad.t - pad.b);

  const maPoints = points.filter((p) => Number.isFinite(p.ma));
  const pathFor = (arr) => arr.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(points.indexOf(p)).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');

  const areaPath = maPoints.length > 1
    ? `${pathFor(maPoints)} L${x(points.indexOf(maPoints[maPoints.length - 1])).toFixed(1)},${(H - pad.b).toFixed(1)} L${x(points.indexOf(maPoints[0])).toFixed(1)},${(H - pad.b).toFixed(1)} Z`
    : '';

  const gridLines = [0.25, 0.5, 0.75].map((f) => {
    const gy = pad.t + f * (H - pad.t - pad.b);
    return `<line class="grid-line" x1="${pad.l}" x2="${W - pad.r}" y1="${gy.toFixed(1)}" y2="${gy.toFixed(1)}"/>`;
  }).join('');

  const goalLine = hasGoal
    ? `<line class="goal-line" x1="${pad.l}" x2="${W - pad.r}" y1="${y(goal).toFixed(1)}" y2="${y(goal).toFixed(1)}"/>
       <text class="axis-text" x="${W - pad.r}" y="${(y(goal) - 5).toFixed(1)}" text-anchor="end" fill="var(--accent)">meta ${fmtNum(goal, 1)}</text>`
    : '';

  const dots = showRaw && points.length <= 40
    ? points.map((p, i) => `<circle class="dot raw" cx="${x(i).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="2.6"/>`).join('')
    : '';

  const lastMa = maPoints[maPoints.length - 1];
  const lastDot = lastMa
    ? `<circle class="dot" cx="${x(points.indexOf(lastMa)).toFixed(1)}" cy="${y(lastMa.value).toFixed(1)}" r="4.4"/>`
    : '';

  const labelIdx = points.length > 1 ? [0, Math.floor((points.length - 1) / 2), points.length - 1] : [0];
  const xLabels = labelIdx.map((i) => (
    `<text class="axis-text" x="${x(i).toFixed(1)}" y="${H - 9}" text-anchor="${i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}">${fmtShort(points[i].date)}</text>`
  )).join('');

  const svgYLabels = [range.hi, (range.hi + range.lo) / 2, range.lo].map((v, idx) => (
    `<text class="axis-text" x="${pad.l - 7}" y="${y(v).toFixed(1)}" text-anchor="end" dy="${idx === 0 ? 8 : idx === 2 ? -3 : 3}">${fmtNum(v, 1)}</text>`
  )).join('');

  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Evolução do peso">
    <defs>
      <linearGradient id="chartGrad" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.30"/>
        <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${gridLines}
    ${goalLine}
    ${areaPath ? `<path class="area" d="${areaPath}"/>` : ''}
    ${showRaw && points.length > 1 ? `<path class="raw-path" d="${pathFor(points)}"/>` : ''}
    ${dots}
    ${maPoints.length > 1 ? `<path class="ma-path" d="${pathFor(maPoints)}"/>` : ''}
    ${lastDot}
    ${xLabels}
    ${svgYLabels}
  </svg>`;
}

export function sparkline(points, { width = 104, height = 44, color = 'var(--accent)' } = {}) {
  const vals = points.map((p) => p.value);
  if (vals.length < 2) return `<div style="width:${width}px;height:${height}px"></div>`;
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const pad = 4;
  const step = (width - pad * 2) / (vals.length - 1);
  const y = (v) => pad + (1 - (v - lo) / (hi - lo || 1)) * (height - pad * 2);
  const d = vals.map((v, i) => `${i ? 'L' : 'M'}${(pad + i * step).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const last = points[points.length - 1];
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" aria-hidden="true">
    <path d="${d}" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${(pad + (vals.length - 1) * step).toFixed(1)}" cy="${y(last.value).toFixed(1)}" r="2.8" fill="${color}"/>
  </svg>`;
}

/** Comparador antes/depois com slider. */
export function compareSlider({ beforeURL, afterURL, beforeLabel = 'Antes', afterLabel = 'Depois' }) {
  return `<div class="compare" data-compare>
    <img src="${beforeURL}" alt="${beforeLabel}" class="cmp-a">
    <div class="cmp-clip" style="clip-path:inset(0 0 0 50%)"><img src="${afterURL}" alt="${afterLabel}"></div>
    <div class="cmp-handle" style="left:50%"><span></span></div>
    <span class="cmp-tag left">${beforeLabel}</span>
    <span class="cmp-tag right">${afterLabel}</span>
    <input type="range" min="0" max="100" value="50" aria-label="Comparar fotos">
  </div>`;
}

export function wireCompareSlider(root) {
  const box = root.querySelector('[data-compare]');
  if (!box) return;
  const clip = box.querySelector('.cmp-clip');
  const handle = box.querySelector('.cmp-handle');
  const input = box.querySelector('input[type="range"]');
  const update = () => {
    const v = Number(input.value);
    clip.style.clipPath = `inset(0 0 0 ${v}%)`;
    handle.style.left = `${v}%`;
  };
  input.addEventListener('input', update);
}
