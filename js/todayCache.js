/* Cache em memória + localStorage para dados do dia */
const mem = {
  date: null,
  data: null,
  ts: 0,
};

function key(date){ return `vitta_today_cache_${date}`; }

export function getMem(date){
  if (mem.date === date && mem.data) return mem.data;
  try {
    const raw = localStorage.getItem(key(date));
    if (raw){
      const parsed = JSON.parse(raw);
      mem.date = date;
      mem.data = parsed;
      mem.ts = Date.now();
      return parsed;
    }
  } catch {}
  return null;
}

export function setMem(date, data){
  mem.date = date;
  mem.data = data;
  mem.ts = Date.now();
  try {
    localStorage.setItem(key(date), JSON.stringify(data));
  } catch {}
}

export function invalidate(date){
  mem.date = null;
  mem.data = null;
  try { localStorage.removeItem(key(date)); } catch {}
}
