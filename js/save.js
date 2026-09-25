// Salvamento local (localStorage) + exportar/importar código de save
import { newState, migrate } from './engine.js';

const KEY = 'eggworld.save.v1';

export function load(now = Date.now()) {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { state: newState(now), fresh: true };
    return { state: migrate(JSON.parse(raw), now), fresh: false };
  } catch (err) {
    console.warn('Save inválido, começando do zero', err);
    return { state: newState(now), fresh: true };
  }
}

export function save(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

export function wipe() {
  try { localStorage.removeItem(KEY); } catch { /* ignora */ }
}

// Código de save: JSON -> UTF-8 -> base64
export function exportCode(s) {
  const bytes = new TextEncoder().encode(JSON.stringify(s));
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return 'EGG1:' + btoa(bin);
}

export function importCode(code, now = Date.now()) {
  const txt = code.trim().replace(/^EGG1:/, '');
  const bin = atob(txt);
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  const obj = JSON.parse(new TextDecoder().decode(bytes));
  if (!obj || !Array.isArray(obj.farms)) throw new Error('Código inválido');
  return migrate(obj, now);
}
