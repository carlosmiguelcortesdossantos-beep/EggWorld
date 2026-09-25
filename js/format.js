// Formatação de números no estilo idle (pt-BR)
const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'Ud', 'Dd', 'Td', 'Qad', 'Qid', 'Sxd', 'Spd', 'Ocd', 'Nod', 'Vg'];

function trim(n, digits) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

export function fmt(n, digits = 2) {
  if (!isFinite(n)) return '∞';
  if (n < 0) return '-' + fmt(-n, digits);
  if (n < 1000) {
    if (n < 10 && n % 1 !== 0) return trim(n, digits);
    if (n % 1 !== 0) return trim(n, 1);
    return trim(n, 0);
  }
  const tier = Math.floor(Math.log10(n) / 3);
  if (tier >= SUFFIXES.length) return n.toExponential(2).replace('+', '');
  const scaled = n / 1000 ** tier;
  const d = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  return trim(Math.floor(scaled * 10 ** d) / 10 ** d, d) + SUFFIXES[tier];
}

export const money = n => '$' + fmt(n);
export const int = n => fmt(Math.floor(n), 0);
export const mult = v => (v >= 1000 ? fmt(v) : trim(Math.round(v * 100) / 100, 2));

export function time(sec) {
  sec = Math.max(0, Math.round(sec));
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60), s = sec % 60;
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60), mm = m % 60;
  if (h < 24) return mm ? `${h}h ${mm}m` : `${h}h`;
  const d = Math.floor(h / 24), hh = h % 24;
  return hh ? `${d}d ${hh}h` : `${d}d`;
}
