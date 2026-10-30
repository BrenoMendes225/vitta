/* Ícones em SVG inline (stroke), no estilo SF Symbols simplificado. */

const P = {
  home: '<path d="M3.5 10.6 12 3.6l8.5 7v8.6a1.3 1.3 0 0 1-1.3 1.3h-4.7v-6.1H9.5v6.1H4.8a1.3 1.3 0 0 1-1.3-1.3z"/>',
  bowl: '<path d="M3.2 11.4h17.6a8.8 8.8 0 0 1-17.6 0Z"/><path d="M7.4 7.6c0-1.1 1-1.5 1-2.6M12 7.6c0-1.1 1-1.5 1-2.6M16.6 7.6c0-1.1 1-1.5 1-2.6"/>',
  scale: '<rect x="3" y="4.2" width="18" height="15.6" rx="4"/><path d="M7.2 11.4a4.8 4.8 0 0 1 9.6 0"/><path d="m12 11.4 2.2-2"/>',
  syringe: '<path d="M16.8 2.6 21.4 7.2M14.6 4.8l4.6 4.6M13.2 6.2 6 13.4l-1.2 4.2 4.2-1.2 7.2-7.2M9.6 9.8l4.6 4.6"/>',
  grid: '<rect x="3.4" y="3.4" width="7" height="7" rx="2"/><rect x="13.6" y="3.4" width="7" height="7" rx="2"/><rect x="3.4" y="13.6" width="7" height="7" rx="2"/><rect x="13.6" y="13.6" width="7" height="7" rx="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  x: '<path d="m6 6 12 12M18 6 6 18"/>',
  check: '<path d="m4.5 12.5 5 5 10-11"/>',
  left: '<path d="m14.5 5-7 7 7 7"/>',
  right: '<path d="m9.5 5 7 7-7 7"/>',
  down: '<path d="m5 9.5 7 7 7-7"/>',
  camera: '<path d="M4.5 8.5h2.6l1.4-2.2h7l1.4 2.2h2.6a1.6 1.6 0 0 1 1.6 1.6v8.2a1.6 1.6 0 0 1-1.6 1.6H4.5a1.6 1.6 0 0 1-1.6-1.6v-8.2a1.6 1.6 0 0 1 1.6-1.6Z"/><circle cx="12" cy="14" r="3.4"/>',
  ruler: '<path d="M3.2 8.6 8.6 3.2l12.2 12.2-5.4 5.4z"/><path d="m7.2 9.4 2 2M10 6.6l2 2M12.8 12.4l2 2M17.6 9.6l2 2"/>',
  activity: '<path d="M3 12.4h4l2.2-6.2 4 12.4 2.4-6.2H21"/>',
  dumbbell: '<path d="M6.6 8.2v7.6M3.4 10v4M17.4 8.2v7.6M20.6 10v4M6.6 12h10.8"/>',
  drop: '<path d="M12 3.4S5.8 10 5.8 14.3a6.2 6.2 0 0 0 12.4 0C18.2 10 12 3.4 12 3.4Z"/>',
  flame: '<path d="M12 21c3.6 0 6.3-2.6 6.3-6 0-4.6-6.3-11.4-6.3-11.4S5.7 10.4 5.7 15c0 3.4 2.7 6 6.3 6Z"/><path d="M12 17.6c1.4 0 2.4-1 2.4-2.4S12 10.6 12 10.6s-2.4 3.2-2.4 4.6 1 2.4 2.4 2.4Z"/>',
  sparkles: '<path d="M12 3.4 13.7 9l5.6 1.7-5.6 1.7L12 18l-1.7-5.6L4.7 10.7 10.3 9z"/><path d="M18.6 15.4l.7 2.2 2.2.7-2.2.7-.7 2.2-.7-2.2-2.2-.7 2.2-.7z"/>',
  sliders: '<path d="M4 7.4h10M18 7.4h2M4 16.6h4M12 16.6h8"/><circle cx="16" cy="7.4" r="2"/><circle cx="10" cy="16.6" r="2"/>',
  download: '<path d="M12 3.6v10.8M7.6 10.2 12 14.6l4.4-4.4M4.4 19.4h15.2"/>',
  upload: '<path d="M12 14.6V3.8M7.6 8.2 12 3.8l4.4 4.4M4.4 19.4h15.2"/>',
  trash: '<path d="M4.6 6.8h14.8M9.6 6.8V4.6h4.8v2.2M6.6 6.8l.9 13.4h9l.9-13.4M10.4 10.6v6M13.6 10.6v6"/>',
  share: '<path d="M12 15.6V3.4M7.6 7.4 12 3l4.4 4.4"/><path d="M5 12.6v6.6a1.6 1.6 0 0 0 1.6 1.6h10.8a1.6 1.6 0 0 0 1.6-1.6v-6.6"/>',
  alert: '<path d="M12 4.2 21 20H3z"/><path d="M12 10v4.6M12 17.4v.2"/>',
  edit: '<path d="M4.6 19.4h4L19.8 8.2a2.1 2.1 0 0 0-3-3L5.6 16.4z"/><path d="m15.4 6.6 3 3"/>',
  moon: '<path d="M20 14.2A8.4 8.4 0 0 1 9.8 4 8.4 8.4 0 1 0 20 14.2Z"/>',
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2M12 19.4v2M2.6 12h2M19.4 12h2M5.4 5.4l1.4 1.4M17.2 17.2l1.4 1.4M18.6 5.4l-1.4 1.4M6.8 17.2l-1.4 1.4"/>',
  target: '<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="4.4"/><circle cx="12" cy="12" r=".9" fill="currentColor" stroke="none"/>',
  calendar: '<rect x="3.6" y="5.4" width="16.8" height="15" rx="3"/><path d="M8 3.2v4M16 3.2v4M3.6 10.2h16.8"/>',
  clock: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.4V12l3.2 2"/>',
  info: '<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.4M12 7.8v.2"/>',
  lock: '<rect x="4.6" y="10.4" width="14.8" height="10" rx="3"/><path d="M8.4 10.4V7.8a3.6 3.6 0 0 1 7.2 0v2.6"/>',
  heart: '<path d="M12 20s-7.6-4.6-7.6-9.6A4.4 4.4 0 0 1 12 7.2a4.4 4.4 0 0 1 7.6 3.2C19.6 15.4 12 20 12 20Z"/>',
  photo: '<rect x="3.4" y="4.6" width="17.2" height="14.8" rx="3"/><circle cx="8.8" cy="9.8" r="1.8"/><path d="m4.6 17 4.6-4.6 3.2 3.2 3-3 4 4"/>',
  list: '<path d="M8.4 6.4h11.2M8.4 12h11.2M8.4 17.6h11.2M4.4 6.4h.2M4.4 12h.2M4.4 17.6h.2"/>',
  trend: '<path d="M3.4 17 9 11.4l3.6 3.6 7.8-7.8"/><path d="M15.4 7.2h5v5"/>',
  copy: '<rect x="8.6" y="8.6" width="11.8" height="11.8" rx="3"/><path d="M15.4 8.6V6.8a3 3 0 0 0-3-3H6.8a3 3 0 0 0-3 3v5.6a3 3 0 0 0 3 3h1.8"/>',
  logout: '<path d="M10 4.6H5.6A1.6 1.6 0 0 0 4 6.2v11.6a1.6 1.6 0 0 0 1.6 1.6H10"/><path d="M15 8.4 18.6 12 15 15.6M9.4 12h9"/>',
  user: '<circle cx="12" cy="8.2" r="3.8"/><path d="M4.8 20.2a7.2 7.2 0 0 1 14.4 0"/>',
};

export function icon(name, size = 20, strokeWidth = 1.8) {
  const path = P[name] || P.info;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}
