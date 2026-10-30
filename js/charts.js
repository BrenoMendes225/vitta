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
 * Anéis de progresso concêntricos (para tela Hoje).
 * rings = [{ r, pct, color, label }, ...]
 * centerValue = número no centro (ex: 75)
 */
export function ringChart(rings, centerValue) {
  let svg = '';
  for (const ring of rings) {
    const R = ring.r;
    const circ = 2 * Math.PI * R;
    const pct = Math.max(0, Math.min(1, ring.pct || 0));
    const dash = pct > 0 ? Math.max(0.5, circ * pct) : 0;
    svg += `<circle cx="100" cy="100" r="${R}" fill="none" stroke="var(--s2)" stroke-width="15"/>
            <circle cx="100" cy="100" r="${R}" fill="none" stroke="${ring.color}" stroke-width="15" stroke-linecap="round" stroke-dasharray="${dash} ${circ}" transform="rotate(-90 100 100)" style="transition:stroke-dasharray .7s"/>`;
  }
  return `<svg viewBox="0 0 200 200" role="img" aria-label="Progresso do dia: ${centerValue}%">${svg}</svg>`;
}

/**
 * Gráfico de peso com área gradiente (estilo acompanhamento.html).
 * points = [{ date, value }]
 * goal = número ou null
 */
export function weightChart(points, goal = null) {
  if (points.length < 2) {
    return `<div class="empty"><p>Registre ao menos 2 pesos neste período para ver o gráfico.</p></div>`;
  }

  const W = 340;
  const H = 180;
  const P = 26;

  const values = points.map(p => p.value);
  const all = goal != null ? [...values, goal] : values;
  const mn = Math.min(...all) - 0.8;
  const mx = Math.max(...all) + 0.8;

  const X = (i) => P + i * (W - 2 * P) / (points.length - 1);
  const Y = (v) => H - P - (v - mn) * (H - 2 * P) / (mx - mn);

  const pts = points.map((_, i) => `${X(i).toFixed(1)},${Y(points[i].value).toFixed(1)}`);
  const l = pts.join(' ');
  const areaPath = `M${X(0)},${H - P} L${l} L${X(points.length - 1)},${H - P} Z`;
  const lastIdx = points.length - 1;

  let goalLine = '';
  if (goal != null) {
    const gy = Y(goal).toFixed(1);
    goalLine = `<line x1="${P}" x2="${W - P}" y1="${gy}" y2="${gy}" stroke="var(--ok)" stroke-width="1.5" stroke-dasharray="5 5"/>
                <text x="${W - P}" y="${(Y(goal) - 6).toFixed(1)}" text-anchor="end" font-size="11" fill="var(--ok)" font-family="DM Sans">meta ${fmtNum(goal, 1)}</text>`;
  }

  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de peso" font-family="DM Sans">
    <defs>
      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="var(--p)" stop-opacity=".35"/>
        <stop offset="1" stop-color="var(--p)" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${goalLine}
    <path d="${areaPath}" fill="url(#chartGrad)"/>
    <polyline points="${l}" fill="none" stroke="var(--p)" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${X(lastIdx).toFixed(1)}" cy="${Y(points[lastIdx].value).toFixed(1)}" r="6" fill="var(--s1)" stroke="var(--p)" stroke-width="3.5"/>
    <text x="${P}" y="${H - 6}" font-size="11" fill="var(--mut)">${fmtShort(points[0].date)}</text>
    <text x="${W - P}" y="${H - 6}" font-size="11" fill="var(--mut)" text-anchor="end">${fmtShort(points[lastIdx].date)}</text>
  </svg>`;
}

/** Sparkline minúsculo (para cards). */
export function sparkline(points, { width = 104, height = 44, color = 'var(--p)' } = {}) {
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