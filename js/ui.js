// ============================================================
// EggWorld — interface (telas, atualização ao vivo e ações)
// ============================================================
import * as E from './engine.js';
import {
  WORLDS, FARM_UPGRADES, SPECIES, SPECIES_BY_ID, MISSIONS, WORKSHOP, LAB, MATERIALS, COLONY_BONUS,
} from './data.js';
import { fmt, money, int, time } from './format.js';

let S = null;               // estado do jogo
let onSave = () => {};
const ui = { tab: 'farm', sig: '', topSig: '', tabSig: '', lastWarn: 0 };
const $ = sel => document.querySelector(sel);

export function init(state, saveFn) {
  S = state;
  onSave = saveFn;
  bindEvents();
  renderAll(true);
}
export function setState(state) { S = state; renderAll(true); }

// ------------------------------------------------------------
// Pequenos componentes
// ------------------------------------------------------------
const RES_ICON = { gold: '🪙', dna: '🧬', money: '💵', ...Object.fromEntries(Object.entries(MATERIALS).map(([k, v]) => [k, v.icon])) };
const RES_NAME = { gold: 'Ouro', dna: 'DNA', money: 'Dinheiro', ...Object.fromEntries(Object.entries(MATERIALS).map(([k, v]) => [k, v.name])) };

function eggHtml(e, cls = '') {
  return `<div class="egg ${cls} ${e.spots ? 'spots' : ''}" style="--c1:${e.colors[0]};--c2:${e.colors[1]}"></div>`;
}
function chick(sp) {
  const f = sp.hue ? `hue-rotate(${sp.hue}deg) saturate(1.5)` : 'none';
  return `<span class="chick-ico" style="filter:${f}">${sp.emoji}</span>`;
}
function rewardsHtml(r) {
  return `<div class="reward-list">${Object.entries(r).map(([k, v]) =>
    `<span class="reward">${RES_ICON[k] || ''} ${k === 'money' ? money(v) : Array.isArray(v) ? (v[0] === v[1] ? v[0] : `${v[0]}–${v[1]}`) : fmt(v)}</span>`).join('')}</div>`;
}
function matCostHtml(cost) {
  return `<div class="cost-line">${Object.entries(cost).map(([k, v]) =>
    `<span class="${(S.mats[k] || 0) >= v ? '' : 'no'}">${RES_ICON[k]} ${fmt(S.mats[k] || 0)}/${fmt(v)}</span>`).join('')}</div>`;
}
function pips(l, max) {
  const n = 10, on = Math.round((l / max) * n);
  return `<div class="pips">${Array.from({ length: n }, (_, i) => `<i class="${i < on ? 'on' : ''}"></i>`).join('')}</div>`;
}
function ordinal(n) { return `${n}ª`; }

export function toast(msg, ms = 2200) {
  const box = $('#toasts');
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = msg;
  box.appendChild(t);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => t.remove(), ms);
}

export function modal(html) {
  const m = $('#modal');
  m.innerHTML = `<div class="modal-box">${html}</div>`;
  m.hidden = false;
}
export function closeModal() {
  const m = $('#modal');
  m.hidden = true;
  m.innerHTML = '';
}

// ------------------------------------------------------------
// Barra superior e abas
// ------------------------------------------------------------
function applyTheme() {
  const w = E.world(S);
  const app = $('#app');
  app.style.setProperty('--sky1', w.sky[0]);
  app.style.setProperty('--sky2', w.sky[1]);
  app.style.setProperty('--ground', w.ground);
  app.style.setProperty('--accent', w.accent);
}

function renderTop() {
  const w = E.world(S);
  const inc = E.totalIncome(S);
  const res = ['gold', 'dna', ...Object.keys(MATERIALS)];
  const html = `
    <div class="tb-row">
      <div class="tb-world">🌍 ${w.name} <span class="badge">Mundo ${S.world + 1}/${WORLDS.length}</span>
        ${S.colonies ? `<span class="badge">🏆 x${fmt(COLONY_BONUS ** S.colonies)}</span>` : ''}</div>
    </div>
    <div class="tb-row">
      <div class="tb-money">${money(S.money)}</div>
      <div class="tb-income">+${money(inc)}/s</div>
    </div>
    <div class="tb-res">${res.map(k => {
      const v = k === 'gold' ? S.gold : k === 'dna' ? S.dna : S.mats[k];
      return `<span class="res-pill" title="${RES_NAME[k]}">${RES_ICON[k]} ${fmt(v)}</span>`;
    }).join('')}</div>`;
  if (html !== ui.topSig) { $('#topbar').innerHTML = html; ui.topSig = html; }
}

const TABS = [
  { id: 'farm', ico: '🏡', name: 'Fazenda' },
  { id: 'upgrades', ico: '⬆️', name: 'Melhorias' },
  { id: 'chickens', ico: '🐔', name: 'Galinhas' },
  { id: 'ships', ico: '🚀', name: 'Naves' },
  { id: 'base', ico: '🔧', name: 'Base' },
];

function tabDots() {
  const fi = S.currentFarm;
  const now = Date.now();
  return {
    upgrades: FARM_UPGRADES.some(u => S.farms[fi].up[u.id] < u.max && E.upgradeCost(S, fi, u.id) <= S.money),
    ships: S.expeditions.some(x => now >= x.end) || E.canColonize(S)
      || (E.freeShips(S) > 0 && MISSIONS.some(m => E.missionUnlocked(S, m.id))),
    base: WORKSHOP.some(w => S.ws[w.id] < w.max && E.canPayMats(S, E.wsCost(S, w.id)))
      || LAB.some(l => S.lab[l.id] < l.max && E.labCost(S, l.id) <= S.gold),
    chickens: SPECIES.some(sp => sp.dna && !S.genes[sp.id] && S.dna >= sp.dna),
  };
}

function renderTabs() {
  const dots = tabDots();
  const html = TABS.map(t => `<button data-act="tab" data-tab="${t.id}" class="${ui.tab === t.id ? 'on' : ''}">
      <span class="ico">${t.ico}</span>${t.name}${dots[t.id] ? '<span class="dot"></span>' : ''}</button>`).join('');
  if (html !== ui.tabSig) { $('#tabs').innerHTML = html; ui.tabSig = html; }
}

// ------------------------------------------------------------
// Seletor de fazendas (compartilhado)
// ------------------------------------------------------------
function farmStrip() {
  return `<div class="farms">${S.farms.map((f, i) => {
    const e = E.egg(S, i);
    if (f.owned) {
      return `<button class="farm-chip ${i === S.currentFarm ? 'on' : ''}" data-act="farm" data-i="${i}">
        ${eggHtml(e)}<span class="nm">${e.name.replace(/^Ovo (de |do )?/, '')}</span></button>`;
    }
    if (i > 0 && S.farms[i - 1].owned) {
      return `<button class="farm-chip buy ${S.money >= e.price ? '' : 'cant'}" data-act="buyFarm" data-i="${i}">
        ${eggHtml(e, 'locked')}<span>Comprar</span><span>${money(e.price)}</span></button>`;
    }
    return `<div class="farm-chip"><div class="egg locked"></div><span class="nm">???</span></div>`;
  }).join('')}</div>`;
}
function farmStripSig() {
  return S.farms.map((f, i) => (f.owned ? 'o' : S.money >= E.egg(S, i).price ? 'b' : 'x')).join('') + S.currentFarm + S.world;
}

// ------------------------------------------------------------
// Tela: Fazenda
// ------------------------------------------------------------
function sceneField(st, farm) {
  const slots = 36;
  const visible = st.count <= 0 ? 0 : Math.max(1, Math.ceil(slots * Math.min(1, st.count / st.cap)));
  // distribui as raças proporcionalmente
  const mix = SPECIES.filter(sp => farm.chickens[sp.id] > 0.5);
  const icons = [];
  mix.forEach(sp => {
    const n = Math.round((farm.chickens[sp.id] / Math.max(1, st.count)) * visible);
    for (let k = 0; k < n; k++) icons.push(sp);
  });
  while (icons.length < visible && mix.length) icons.push(mix[0]);
  return icons.slice(0, visible).map((sp, i) => {
    const x = (i * 37 + 7) % 92, y = (i * 53 + 11) % 70;
    return `<span class="chk" style="left:${x}%;top:${y}%;animation-delay:${(i % 7) * 0.3}s">${chick(sp)}</span>`;
  }).join('');
}

const farmScreen = {
  sig() {
    const f = S.farms[S.currentFarm];
    const st = E.farmStats(S, S.currentFarm);
    const lic = SPECIES.filter(sp => f.licenses[sp.id]).map(sp => sp.id).join(',');
    return ['farm', farmStripSig(), st.coops, Math.min(6, st.vehicles), lic, f.hatchSpecies].join('|');
  },
  html() {
    const fi = S.currentFarm;
    const f = S.farms[fi];
    const e = E.egg(S, fi);
    const st = E.farmStats(S, fi);
    const w = E.world(S);
    const trucks = Math.min(6, st.vehicles);
    const licensed = SPECIES.filter(sp => f.licenses[sp.id]);
    const sp = SPECIES_BY_ID[f.hatchSpecies];
    const night = S.world === 4;
    return `
      ${farmStrip()}
      <div class="scene" id="scene">
        <div class="sun">${night ? '🪐' : S.world === 3 ? '❄️' : '☀️'}</div>
        <div class="cloud" style="top:14px;animation-delay:-8s">${night ? '✨' : '☁️'}</div>
        <div class="cloud" style="top:44px;animation-delay:-26s;font-size:22px">${night ? '🌟' : '☁️'}</div>
        <div class="scene-eggname">${eggHtml(e, 'sm')} ${e.name}</div>
        <div class="coops">${'🏠'.repeat(st.coops)}</div>
        <div class="field" data-live="field"></div>
        <div class="road">${Array.from({ length: trucks }, (_, i) =>
          `<span class="truck" style="animation-delay:-${(i * 6) / trucks}s">🚚</span>`).join('')}</div>
      </div>
      <div class="stats">
        <div class="stat" data-live="st-chk-box">
          <div class="lbl">🐔 Galinhas</div>
          <div class="val" data-live="st-chk"></div>
          <div class="bar"><i data-live="st-chk-bar"></i></div>
        </div>
        <div class="stat">
          <div class="lbl">🥚 Postura</div>
          <div class="val" data-live="st-lay"></div>
          <div class="small muted" data-live="st-lay-sub"></div>
        </div>
        <div class="stat" data-live="st-ship-box">
          <div class="lbl">🚚 Entregas (${st.vehicles} veículo${st.vehicles > 1 ? 's' : ''})</div>
          <div class="val" data-live="st-ship"></div>
          <div class="bar" data-live="st-ship-barbox"><i data-live="st-ship-bar"></i></div>
        </div>
        <div class="stat">
          <div class="lbl">💵 Renda desta fazenda</div>
          <div class="val" data-live="st-inc"></div>
          <div class="small muted" data-live="st-inc-sub"></div>
        </div>
      </div>
      <div class="hint" data-live="hint" hidden></div>
      <div class="hatch-area">
        <button class="hatch-btn" data-hold="hatch" data-live="hatch-btn" aria-label="Chocar galinhas">
          <span class="chick">🐣</span>
          <span>Chocar</span>
          <span class="small" data-live="hatch-n"></span>
        </button>
        <div class="grow">
          <div style="color:#fff;font-weight:800;margin-bottom:4px">Chocando: ${sp.name}</div>
          <div class="species-pick">${licensed.map(x =>
            `<button class="sp-chip ${x.id === f.hatchSpecies ? 'on' : ''}" data-act="pickSpecies" data-sp="${x.id}">${chick(x)} ${x.name.replace('Galinha ', '')}</button>`).join('')}
          </div>
          <div style="color:#fff;font-size:12px;margin-top:6px;opacity:.85" data-live="hatch-info"></div>
          ${licensed.length < 2 ? `<div style="color:#fff;font-size:12px;margin-top:4px;opacity:.7">Libere novas raças na aba 🐔 Galinhas.</div>` : ''}
        </div>
      </div>
      ${w && S.stats.hatched < 30 && S.colonies === 0 ? `<div class="hint">👆 Toque (ou segure) o ovo para chocar galinhas. Elas botam ovos que os veículos entregam por dinheiro. Invista em ⬆️ Melhorias!</div>` : ''}
    `;
  },
  live() {
    const fi = S.currentFarm;
    const f = S.farms[fi];
    const st = E.farmStats(S, fi);
    const full = st.count >= st.cap - 0.5;
    const shipBad = st.shipUse > 1.001;
    const out = {
      field: { html: sceneField(st, f) },
      'st-chk': `${int(st.count)} / ${int(st.cap)}`,
      'st-chk-bar': { width: `${Math.min(100, (st.count / st.cap) * 100)}%` },
      'st-chk-box': { cls: `stat ${full ? 'warn' : ''}` },
      'st-lay': `${fmt(st.eggsPerSec)} ovos/s`,
      'st-lay-sub': `${money(st.eggValue)} por ovo`,
      'st-ship': `${fmt(st.shippedPerSec)} / ${fmt(st.shipCap)}`,
      'st-ship-bar': { width: `${Math.min(100, st.shipUse * 100)}%` },
      'st-ship-barbox': { cls: `bar ${shipBad ? 'bad' : st.shipUse > 0.85 ? 'warn' : ''}` },
      'st-ship-box': { cls: `stat ${shipBad ? 'bad' : ''}` },
      'st-inc': `${money(st.income)}/s`,
      'st-inc-sub': f.colonyPct > 0 ? `🚀 ${f.colonyPct}% dos ovos vão para a nave` : `${fmt(st.shippedPerSec)} ovos vendidos/s`,
      'hatch-n': `+${int(st.tapHatch)} por toque`,
      'hatch-btn': { cls: `hatch-btn ${full && f.hatchSpecies === 'comum' ? 'full' : ''}` },
    };
    const auto = st.autoHatch + st.breed;
    let info = auto > 0 ? `⚙️ ${fmt(auto, 1)} galinhas/s automáticas` : 'Compre a Incubadora automática em Melhorias.';
    if (f.hatchSpecies !== 'comum') info = `Custa ${money(E.hatchCost(S, fi, f.hatchSpecies, st))} por galinha. ${full ? 'Galinheiro cheio: substitui galinhas comuns.' : ''}`;
    out['hatch-info'] = info;
    const hints = [];
    if (full) hints.push('🏠 Galinheiros lotados! Amplie em ⬆️ Melhorias.');
    if (shipBad) hints.push(`🚚 Veículos lotados: ${fmt(st.wastedPerSec)} ovos/s estragam. Melhore o transporte ou use Galinhas Pluma.`);
    out.hint = { text: hints.join(' '), hidden: hints.length === 0 };
    return out;
  },
};

// ------------------------------------------------------------
// Tela: Melhorias
// ------------------------------------------------------------
const QTY = [1, 10, 'max'];
const upgradesScreen = {
  sig() {
    const f = S.farms[S.currentFarm];
    return ['up', farmStripSig(), S.settings.buyQty, FARM_UPGRADES.map(u => f.up[u.id]).join(',')].join('|');
  },
  html() {
    const fi = S.currentFarm;
    const f = S.farms[fi];
    const e = E.egg(S, fi);
    const groups = [...new Set(FARM_UPGRADES.map(u => u.group))];
    return `
      ${farmStrip()}
      <div class="section-title">
        <span>${eggHtml(e, 'sm')} ${e.name}</span>
        <div class="seg">${QTY.map(q => `<button class="${S.settings.buyQty === q ? 'on' : ''}" data-act="qty" data-q="${q}">${q === 'max' ? 'Máx' : 'x' + q}</button>`).join('')}</div>
      </div>
      ${groups.map(g => `
        <div class="section-title" style="font-size:15px;margin-top:8px">${g}</div>
        ${FARM_UPGRADES.filter(u => u.group === g).map(u => {
          const l = f.up[u.id];
          const maxed = l >= u.max;
          return `<div class="card up">
            <div class="ico">${u.icon}</div>
            <div class="grow">
              <div class="name">${u.name} <span class="lvl">Nv ${l}${maxed ? ' MÁX' : ''}</span></div>
              <div class="desc">${u.desc}</div>
              <div class="eff" data-live="eff-${u.id}"></div>
              ${pips(l, u.max)}
            </div>
            ${maxed ? `<button class="btn maxed" disabled>MÁX</button>` : `<button class="btn" data-act="buyUp" data-id="${u.id}" data-live="btn-${u.id}">
              <span data-live="cost-${u.id}"></span><span class="sub" data-live="n-${u.id}"></span></button>`}
          </div>`;
        }).join('')}
      `).join('')}`;
  },
  live() {
    const fi = S.currentFarm;
    const f = S.farms[fi];
    const out = {};
    for (const u of FARM_UPGRADES) {
      const l = f.up[u.id];
      if (l >= u.max) { out[`eff-${u.id}`] = u.fmt(u.effect(l)); continue; }
      const { n, cost } = E.bulkUpgrade(S, fi, u.id, S.settings.buyQty);
      out[`eff-${u.id}`] = `${u.fmt(u.effect(l))} → ${u.fmt(u.effect(l + n))}`;
      out[`cost-${u.id}`] = money(cost);
      out[`n-${u.id}`] = `+${n} nível${n > 1 ? 's' : ''}`;
      out[`btn-${u.id}`] = { disabled: cost > S.money || n === 0 };
    }
    return out;
  },
};

// ------------------------------------------------------------
// Tela: Galinhas
// ------------------------------------------------------------
function traits(sp) {
  const t = [];
  const tag = (v, label, good) => t.push(`<span class="trait ${good === null ? '' : good ? 'up' : 'down'}">${label}</span>`);
  if (sp.lay !== 1) tag(sp.lay, `Postura x${fmt(sp.lay)}`, sp.lay > 1);
  if (sp.value !== 1) tag(sp.value, `Valor x${fmt(sp.value)}`, sp.value > 1);
  if (sp.weight !== 1) tag(sp.weight, `Peso ${Math.round(sp.weight * 100)}%`, sp.weight < 1);
  if (sp.breed) tag(sp.breed, `Gera ${fmt(sp.breed * 60, 1)} galinha/min`, true);
  if (!t.length) tag(1, 'Padrão', null);
  return `<div class="traits">${t.join('')}</div>`;
}

const chickensScreen = {
  sig() {
    const f = S.farms[S.currentFarm];
    return ['chk', farmStripSig(), f.hatchSpecies, JSON.stringify(f.licenses), JSON.stringify(S.genes)].join('|');
  },
  html() {
    const fi = S.currentFarm;
    const f = S.farms[fi];
    const e = E.egg(S, fi);
    return `
      ${farmStrip()}
      <div class="section-title"><span>${eggHtml(e, 'sm')} Raças da fazenda</span><small>🧬 ${fmt(S.dna)} DNA</small></div>
      <div class="hint">Cada raça tem genética diferente. Raças especiais custam dinheiro para chocar e, com o galinheiro cheio, substituem galinhas comuns.</div>
      ${SPECIES.map(sp => {
        const avail = E.speciesAvailable(S, sp.id);
        const lic = f.licenses[sp.id];
        let action;
        if (!avail) {
          action = `<button class="btn purple" data-act="gene" data-sp="${sp.id}" data-live="gene-${sp.id}">
            <span>Sequenciar</span><span class="sub">🧬 ${sp.dna} DNA</span></button>`;
        } else if (!lic) {
          action = `<button class="btn blue" data-act="license" data-sp="${sp.id}" data-live="lic-${sp.id}">
            <span>Liberar</span><span class="sub">${money(E.licenseCost(S, fi, sp.id))}</span></button>`;
        } else if (f.hatchSpecies === sp.id) {
          action = `<button class="btn gold" disabled style="background:#ffb020;box-shadow:0 4px 0 #c47f00">✓ Chocando</button>`;
        } else {
          action = `<button class="btn" data-act="pickSpecies" data-sp="${sp.id}">Chocar esta</button>`;
        }
        return `<div class="card up sp-card" style="${!avail ? 'opacity:.9' : ''}">
          <div class="big-ico">${avail ? chick(sp) : '❓'}</div>
          <div class="grow">
            <div class="name">${sp.name} ${sp.dna ? '<span class="lvl">🧬 Exploração</span>' : ''}</div>
            <div class="desc">${sp.desc}</div>
            ${traits(sp)}
            ${lic ? `<div class="small" style="font-weight:800;margin-top:3px" data-live="own-${sp.id}"></div>` : ''}
          </div>
          ${action}
        </div>`;
      }).join('')}`;
  },
  live() {
    const fi = S.currentFarm;
    const f = S.farms[fi];
    const st = E.farmStats(S, fi);
    const out = {};
    for (const sp of SPECIES) {
      const own = f.chickens[sp.id];
      const price = sp.id === 'comum' ? 'grátis' : `${money(E.hatchCost(S, fi, sp.id, st))} cada`;
      out[`own-${sp.id}`] = `Nesta fazenda: ${int(own)} · ${price}`;
      out[`gene-${sp.id}`] = { disabled: S.dna < (sp.dna || 0) };
      out[`lic-${sp.id}`] = { disabled: S.money < E.licenseCost(S, fi, sp.id) };
    }
    return out;
  },
};

// ------------------------------------------------------------
// Tela: Naves (colonização + exploração)
// ------------------------------------------------------------
const shipsScreen = {
  sig() {
    return ['ships', S.world, S.colonies, E.canColonize(S), S.expeditions.length, E.shipCount(S), E.progressIndex(S),
      S.farms.map(f => `${f.owned}${f.colonyPct}${f.colonyStored >= 0 ? '' : ''}`).join(','),
      S.expeditions.map(x => Date.now() >= x.end).join(',')].join('|');
  },
  html() {
    const w = E.world(S);
    const last = S.world === WORLDS.length - 1;
    const next = last ? `outra ${w.name}` : WORLDS[S.world + 1].name;
    const now = Date.now();
    const free = E.freeShips(S);
    return `
      <div class="section-title">🚀 Nave de colonização</div>
      <div class="ship-hero">
        <div class="rocket">🚀</div>
        <h3>Destino: ${next}</h3>
        <div class="small" style="opacity:.8;max-width:75%">Estoque ovos de cada fazenda para colonizar o próximo mundo. Ajuste quanto de cada fazenda vai para a nave (esses ovos não são vendidos).</div>
        ${S.farms.map((f, i) => {
          const e = E.egg(S, i);
          const done = f.colonyStored >= e.colonyGoal;
          return `<div class="colony-row">
            ${eggHtml(e, 'sm')}
            <div class="grow">
              <div class="small" style="display:flex;justify-content:space-between;font-weight:700">
                <span>${f.owned ? e.name : '🔒 ' + e.name}</span><span data-live="col-${i}"></span></div>
              <div class="bar gold"><i data-live="colbar-${i}"></i></div>
            </div>
            ${f.owned && !done ? `<div class="seg" style="flex:none">
              <button data-act="pct" data-i="${i}" data-d="-10">−</button>
              <button class="on" style="min-width:48px">${f.colonyPct}%</button>
              <button data-act="pct" data-i="${i}" data-d="10">+</button></div>` : done ? '<span style="font-size:20px">✅</span>' : ''}
          </div>`;
        }).join('')}
        <div style="margin-top:12px">
          <button class="btn gold wide" data-act="colonize" ${E.canColonize(S) ? '' : 'disabled'}>
            ${E.canColonize(S) ? `🚀 Colonizar ${next}!` : 'Encha a nave com ovos das 5 fazendas'}</button>
        </div>
      </div>

      <div class="section-title">🛸 Exploração <small>${free}/${E.shipCount(S)} naves livres</small></div>
      ${S.expeditions.length ? S.expeditions.map((x, idx) => {
        const m = E.MISSION[x.id];
        const done = now >= x.end;
        return `<div class="card expedition">
          <div style="font-size:30px">${m.icon}</div>
          <div class="grow">
            <div class="name" style="font-weight:800">${m.name}</div>
            ${done ? rewardsHtml(x.rewards) : `<div class="small muted" data-live="exp-t-${idx}"></div>
              <div class="bar"><i data-live="exp-b-${idx}"></i></div>`}
          </div>
          ${done ? `<button class="btn" data-act="collect" data-i="${idx}">Coletar</button>` : ''}
        </div>`;
      }).join('') : '<div class="hint">Nenhuma nave em missão. Envie naves para buscar materiais, ouro e DNA!</div>'}

      <div class="section-title" style="font-size:15px">Destinos</div>
      ${MISSIONS.map(m => {
        const unlocked = E.missionUnlocked(S, m.id);
        const range = Object.fromEntries(Object.entries(m.rewards).map(([k, [a, b]]) => {
          const sc = E.missionScale(S);
          return [k, [Math.floor(a * sc), Math.ceil(b * sc)]];
        }));
        return `<div class="card up mission" style="${unlocked ? '' : 'opacity:.6'}">
          <div class="ico">${m.icon}</div>
          <div class="grow">
            <div class="name">${m.name} <span class="lvl">⏱ ${time(E.missionDuration(S, m.id))}</span></div>
            <div class="desc">${m.desc}</div>
            ${rewardsHtml(range)}
          </div>
          ${unlocked ? `<button class="btn blue" data-act="launch" data-id="${m.id}" ${free > 0 ? '' : 'disabled'}>Lançar</button>`
            : `<button class="btn" disabled><span>🔒</span><span class="sub">${ordinal(m.req + 1)} fazenda</span></button>`}
        </div>`;
      }).join('')}`;
  },
  live() {
    const out = {};
    const now = Date.now();
    S.farms.forEach((f, i) => {
      const goal = E.egg(S, i).colonyGoal;
      out[`col-${i}`] = `${int(f.colonyStored)} / ${fmt(goal)}`;
      out[`colbar-${i}`] = { width: `${Math.min(100, (f.colonyStored / goal) * 100)}%` };
    });
    S.expeditions.forEach((x, idx) => {
      out[`exp-t-${idx}`] = `Volta em ${time((x.end - now) / 1000)}`;
      out[`exp-b-${idx}`] = { width: `${Math.min(100, ((now - x.start) / (x.end - x.start)) * 100)}%` };
    });
    return out;
  },
};

// ------------------------------------------------------------
// Tela: Base (silos, oficina, laboratório, ajustes)
// ------------------------------------------------------------
const baseScreen = {
  sig() {
    return ['base', JSON.stringify(S.ws), JSON.stringify(S.lab)].join('|');
  },
  html() {
    const groups = [...new Set(WORKSHOP.map(u => u.group))];
    return `
      <div class="section-title">🛢️ Silos de ração</div>
      <div class="card soft">
        <div class="row">
          <div style="font-size:40px">${'🛢️'.repeat(Math.min(5, E.wsEffect(S, 'silo')))}</div>
          <div class="grow">
            <div style="font-weight:800">${E.wsEffect(S, 'silo')} silo(s)</div>
            <div class="small muted">Com o app fechado, sua granja continua produzindo por até <b>${time(E.offlineCap(S))}</b>. Construa e melhore silos na Oficina.</div>
          </div>
        </div>
      </div>

      <div class="section-title">🔧 Oficina <small>melhorias com materiais</small></div>
      ${groups.map(g => `
        <div class="section-title" style="font-size:14px;margin-top:4px">${g}</div>
        ${WORKSHOP.filter(u => u.group === g).map(u => {
          const l = S.ws[u.id];
          const maxed = l >= u.max;
          return `<div class="card up">
            <div class="ico">${u.icon}</div>
            <div class="grow">
              <div class="name">${u.name} <span class="lvl">Nv ${l}${maxed ? ' MÁX' : ''}</span></div>
              <div class="desc">${u.desc}</div>
              <div class="eff">${u.fmt(u.effect(l))}${maxed ? '' : ` → ${u.fmt(u.effect(l + 1))}`}</div>
              ${maxed ? '' : `<div data-live="wsc-${u.id}"></div>`}
            </div>
            ${maxed ? `<button class="btn maxed" disabled>MÁX</button>`
              : `<button class="btn purple" data-act="ws" data-id="${u.id}" data-live="wsb-${u.id}">Construir</button>`}
          </div>`;
        }).join('')}`).join('')}

      <div class="section-title">🧪 Laboratório <small>🪙 ${fmt(S.gold)} ouro</small></div>
      <div class="hint">O ouro espacial vem das missões de exploração e das colonizações. Melhorias do laboratório são permanentes.</div>
      ${LAB.map(u => {
        const l = S.lab[u.id];
        const maxed = l >= u.max;
        return `<div class="card up">
          <div class="ico">${u.icon}</div>
          <div class="grow">
            <div class="name">${u.name} <span class="lvl">Nv ${l}${maxed ? ' MÁX' : ''}</span></div>
            <div class="desc">${u.desc}</div>
            <div class="eff">${u.fmt(u.effect(l))}${maxed ? '' : ` → ${u.fmt(u.effect(l + 1))}`}</div>
          </div>
          ${maxed ? `<button class="btn maxed" disabled>MÁX</button>`
            : `<button class="btn gold" data-act="lab" data-id="${u.id}" data-live="labb-${u.id}"><span>Pesquisar</span><span class="sub">🪙 ${fmt(E.labCost(S, u.id))}</span></button>`}
        </div>`;
      }).join('')}

      <div class="section-title">⚙️ Ajustes</div>
      <div class="card">
        <div class="kv"><span>Total ganho</span><span data-live="stat-earned"></span></div>
        <div class="kv"><span>Galinhas chocadas</span><span data-live="stat-hatched"></span></div>
        <div class="kv"><span>Missões concluídas</span><span>${fmt(S.stats.missionsDone)}</span></div>
        <div class="kv"><span>Mundos colonizados</span><span>${S.colonies}</span></div>
      </div>
      <div class="card" style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <button class="btn blue" data-act="help">❓ Como jogar</button>
        <button class="btn blue" data-act="export">📤 Exportar save</button>
        <button class="btn blue" data-act="import">📥 Importar save</button>
        <button class="btn red" data-act="reset">🗑️ Apagar tudo</button>
      </div>
      <div class="center small" style="color:#fff;opacity:.5;margin:10px 0">EggWorld · feito para jogar com os amigos 🥚</div>`;
  },
  live() {
    const out = {
      'stat-earned': money(S.stats.earnedTotal),
      'stat-hatched': int(S.stats.hatched),
    };
    for (const u of WORKSHOP) {
      if (S.ws[u.id] >= u.max) continue;
      const c = E.wsCost(S, u.id);
      out[`wsc-${u.id}`] = { html: matCostHtml(c) };
      out[`wsb-${u.id}`] = { disabled: !E.canPayMats(S, c) };
    }
    for (const u of LAB) out[`labb-${u.id}`] = { disabled: S.gold < E.labCost(S, u.id) };
    return out;
  },
};

const SCREENS = { farm: farmScreen, upgrades: upgradesScreen, chickens: chickensScreen, ships: shipsScreen, base: baseScreen };

// ------------------------------------------------------------
// Renderização
// ------------------------------------------------------------
function applyLive(root, map) {
  root.querySelectorAll('[data-live]').forEach(el => {
    const v = map[el.dataset.live];
    if (v === undefined) return;
    if (typeof v !== 'object') {
      const t = String(v);
      if (el.textContent !== t) el.textContent = t;
      return;
    }
    if ('text' in v && el.textContent !== v.text) el.textContent = v.text;
    if ('html' in v && el._html !== v.html) { el.innerHTML = v.html; el._html = v.html; }
    if ('disabled' in v && el.disabled !== v.disabled) el.disabled = v.disabled;
    if ('width' in v && el.style.width !== v.width) el.style.width = v.width;
    if ('cls' in v && el.className !== v.cls) el.className = v.cls;
    if ('hidden' in v && el.hidden !== v.hidden) el.hidden = v.hidden;
  });
}

export function renderAll(force = false) {
  applyTheme();
  renderTop();
  renderTabs();
  const scr = SCREENS[ui.tab];
  const root = $('#screen');
  const sig = scr.sig();
  if (force || sig !== ui.sig) {
    const scroll = root.scrollTop;
    root.innerHTML = scr.html();
    ui.sig = sig;
    root.scrollTop = scroll;
  }
  applyLive(root, scr.live());
}

function switchTab(tab) {
  if (ui.tab === tab) return;
  ui.tab = tab;
  $('#screen').scrollTop = 0;
  ui.sig = '';
  renderAll(true);
}

// ------------------------------------------------------------
// Ações
// ------------------------------------------------------------
function flyText(text) {
  const scene = $('#scene');
  if (!scene) return;
  const el = document.createElement('div');
  el.className = 'egg-fly';
  el.textContent = text;
  el.style.left = `${20 + Math.random() * 60}%`;
  el.style.top = `${110 + Math.random() * 30}px`;
  scene.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

function doHatchTap() {
  const fi = S.currentFarm;
  const f = S.farms[fi];
  const n = E.tap(S, fi);
  if (n > 0) {
    flyText(`+${int(n)} 🐣`);
    return true;
  }
  const now = Date.now();
  if (now - ui.lastWarn > 1500) {
    ui.lastWarn = now;
    const st = E.farmStats(S, fi);
    if (f.hatchSpecies !== 'comum' && S.money < E.hatchCost(S, fi, f.hatchSpecies, st)) toast('💸 Dinheiro insuficiente para essa raça');
    else toast('🏠 Galinheiros lotados! Amplie em Melhorias.');
  }
  return false;
}

const ACTIONS = {
  tab: el => switchTab(el.dataset.tab),
  farm: el => { S.currentFarm = +el.dataset.i; renderAll(true); },
  buyFarm: el => {
    const i = +el.dataset.i;
    const e = E.egg(S, i);
    if (E.buyFarm(S, i)) {
      S.currentFarm = i;
      toast(`🎉 Nova fazenda: ${e.name}!`);
      onSave();
      renderAll(true);
    } else toast(`Faltam ${money(e.price - S.money)} para esta fazenda`);
  },
  qty: el => { const q = el.dataset.q; S.settings.buyQty = q === 'max' ? 'max' : +q; renderAll(true); },
  buyUp: el => { if (E.buyUpgrade(S, S.currentFarm, el.dataset.id, S.settings.buyQty)) renderAll(); },
  pickSpecies: el => { S.farms[S.currentFarm].hatchSpecies = el.dataset.sp; renderAll(true); },
  license: el => {
    const sp = SPECIES_BY_ID[el.dataset.sp];
    if (E.buyLicense(S, S.currentFarm, sp.id)) {
      S.farms[S.currentFarm].hatchSpecies = sp.id;
      toast(`${sp.name} liberada nesta fazenda!`);
      renderAll(true);
    }
  },
  gene: el => {
    const sp = SPECIES_BY_ID[el.dataset.sp];
    if (E.unlockGene(S, sp.id)) {
      modal(`<div class="emoji">🧬</div><h2 class="center">Nova raça descoberta!</h2>
        <p class="center">A <b>${sp.name}</b> pode ser liberada em qualquer fazenda.</p>
        <p class="center muted small">${sp.desc}</p>
        <div class="modal-actions"><button class="btn" data-act="close">Incrível!</button></div>`);
      renderAll(true);
    }
  },
  pct: el => {
    const f = S.farms[+el.dataset.i];
    f.colonyPct = Math.max(0, Math.min(100, f.colonyPct + +el.dataset.d));
    renderAll(true);
  },
  colonize: () => {
    if (!E.canColonize(S)) return;
    const last = S.world === WORLDS.length - 1;
    const next = last ? `uma nova ${E.world(S).name}` : WORLDS[S.world + 1].name;
    modal(`<div class="emoji">🚀</div><h2 class="center">Colonizar ${next}?</h2>
      <p>Sua tripulação vai partir! O que acontece:</p>
      <div class="kv"><span>❌ Fica para trás</span><span>dinheiro, fazendas, galinhas</span></div>
      <div class="kv"><span>✅ Você mantém</span><span>ouro, DNA, materiais, raças, oficina, laboratório</span></div>
      <div class="kv"><span>🏆 Bônus permanente</span><span>renda x${COLONY_BONUS} (total x${fmt(COLONY_BONUS ** (S.colonies + 1))})</span></div>
      <div class="kv"><span>🪙 Recompensa</span><span>${E.colonizeReward(S)} ouro</span></div>
      <div class="modal-actions"><button class="btn ghost" data-act="close">Ainda não</button><button class="btn gold" data-act="colonizeGo">Partir!</button></div>`);
  },
  colonizeGo: () => {
    const from = E.world(S).name;
    if (E.colonize(S)) {
      closeModal();
      onSave();
      ui.tab = 'farm';
      renderAll(true);
      modal(`<div class="emoji">🌍</div><h2 class="center">Bem-vindo a ${E.world(S).name}!</h2>
        <p class="center">${E.world(S).desc}</p>
        <p class="center muted small">Você deixou ${from} para trás. Sua renda agora é x${fmt(COLONY_BONUS ** S.colonies)} para sempre.</p>
        <div class="modal-actions"><button class="btn" data-act="close">Vamos lá!</button></div>`);
    }
  },
  launch: el => {
    const m = E.MISSION[el.dataset.id];
    if (E.launchMission(S, m.id)) { toast(`${m.icon} Nave lançada para ${m.name}!`); onSave(); renderAll(true); }
  },
  collect: el => {
    const ex = E.collectMission(S, +el.dataset.i);
    if (ex) {
      const m = E.MISSION[ex.id];
      toast(`${m.icon} ${Object.entries(ex.rewards).map(([k, v]) => `${RES_ICON[k]} +${fmt(v)}`).join('  ')}`, 3000);
      onSave();
      renderAll(true);
    }
  },
  ws: el => { const u = E.WS[el.dataset.id]; if (E.buyWorkshop(S, u.id)) { toast(`${u.icon} ${u.name} melhorado!`); onSave(); renderAll(true); } },
  lab: el => { const u = E.LABS[el.dataset.id]; if (E.buyLab(S, u.id)) { toast(`${u.icon} ${u.name} pesquisado!`); onSave(); renderAll(true); } },
  close: () => closeModal(),
  help: () => showHelp(),
  export: () => exportDialog(),
  import: () => importDialog(),
  importGo: () => importGo(),
  reset: () => modal(`<div class="emoji">⚠️</div><h2 class="center">Apagar todo o progresso?</h2>
      <p class="center">Isso não pode ser desfeito. Exporte seu save antes se quiser guardar.</p>
      <div class="modal-actions"><button class="btn ghost" data-act="close">Cancelar</button><button class="btn red" data-act="resetGo">Apagar</button></div>`),
  resetGo: () => { closeModal(); window.dispatchEvent(new CustomEvent('egg:reset')); },
  copy: () => {
    const ta = $('#save-code');
    ta.select();
    (navigator.clipboard ? navigator.clipboard.writeText(ta.value) : Promise.reject())
      .then(() => toast('📋 Copiado!'))
      .catch(() => { document.execCommand('copy'); toast('📋 Copiado!'); });
  },
  gift: el => {
    el.remove();
    window.dispatchEvent(new CustomEvent('egg:gift'));
  },
};

export function showHelp() {
  modal(`<div class="emoji">🥚</div><h2 class="center">Como jogar</h2>
    <div class="small">
    <p><b>🐣 Choque galinhas</b> tocando (ou segurando) o ovo grande. Galinhas botam ovos e os <b>veículos</b> entregam para vender.</p>
    <p><b>⬆️ Melhorias</b> aumentam o preço do ovo, a postura, os galinheiros, a chocadeira e a frota. Fique de olho nos gargalos: galinheiro cheio ou veículos lotados.</p>
    <p><b>🥚 Novas fazendas</b>: cada mundo tem 5 ovos, cada um mais valioso. Todas as fazendas produzem ao mesmo tempo.</p>
    <p><b>🐔 Raças</b>: Reprodutora gera galinhas sozinha, Dourada tem ovo 3x mais caro e Pluma tem ovo superleve. Outras raças vêm do DNA das explorações.</p>
    <p><b>🚀 Colonização</b>: envie parte dos ovos de cada fazenda para a nave. Com as 5 metas cheias, colonize o próximo mundo e ganhe renda x2 para sempre.</p>
    <p><b>🛸 Exploração</b>: naves trazem metal, cristal, fibra, núcleos, ouro e DNA. Use na <b>🔧 Oficina</b> (veículos, galinheiros, silos) e no <b>🧪 Laboratório</b>.</p>
    <p><b>🛢️ Silos</b> mantêm a granja funcionando com o app fechado.</p>
    </div>
    <div class="modal-actions"><button class="btn" data-act="close">Entendi!</button></div>`);
}

function exportDialog() {
  window.dispatchEvent(new CustomEvent('egg:export', { detail: code => {
    modal(`<h2>📤 Exportar save</h2>
      <p class="small muted">Copie o código e guarde (ou mande para outro aparelho).</p>
      <textarea id="save-code" readonly>${code}</textarea>
      <div class="modal-actions"><button class="btn ghost" data-act="close">Fechar</button><button class="btn blue" data-act="copy">📋 Copiar</button></div>`);
  } }));
}

function importDialog() {
  modal(`<h2>📥 Importar save</h2>
    <p class="small muted">Cole o código exportado. O progresso atual será substituído.</p>
    <textarea id="save-code" placeholder="EGG1:..."></textarea>
    <div class="modal-actions"><button class="btn ghost" data-act="close">Cancelar</button><button class="btn blue" data-act="importGo">Importar</button></div>`);
}
function importGo() {
  const code = $('#save-code').value;
  window.dispatchEvent(new CustomEvent('egg:import', { detail: code }));
}

// ------------------------------------------------------------
// Presente voador
// ------------------------------------------------------------
export function showGift() {
  if (document.querySelector('.gift')) return;
  const el = document.createElement('button');
  el.className = 'gift';
  el.dataset.act = 'gift';
  el.innerHTML = '<span>🎁</span>';
  el.setAttribute('aria-label', 'Presente');
  $('#app').appendChild(el);
  setTimeout(() => el.remove(), 18000);
}
export function giftToast(r) {
  toast(`🎁 Presente! ${Object.entries(r).map(([k, v]) => `${RES_ICON[k]} +${k === 'money' ? money(v) : fmt(v)}`).join(' ')}`, 3000);
}

// ------------------------------------------------------------
// Eventos
// ------------------------------------------------------------
function bindEvents() {
  const app = $('#app');
  app.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = ACTIONS[el.dataset.act];
    if (fn) fn(el);
  });
  // fechar modal tocando fora
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal' && !$('#modal .no-dismiss')) closeModal(); });

  // Segurar para chocar
  let timer = null, btn = null;
  const stop = () => {
    clearInterval(timer);
    timer = null;
    if (btn) btn.classList.remove('pressed');
    btn = null;
  };
  app.addEventListener('pointerdown', e => {
    const b = e.target.closest('[data-hold="hatch"]');
    if (!b) return;
    e.preventDefault();
    stop();
    btn = b;
    btn.classList.add('pressed');
    doHatchTap();
    timer = setInterval(() => { if (!doHatchTap()) { /* continua tentando */ } }, 130);
  });
  window.addEventListener('pointerup', stop);
  window.addEventListener('pointercancel', stop);
  window.addEventListener('blur', stop);
  app.addEventListener('contextmenu', e => { if (e.target.closest('[data-hold]')) e.preventDefault(); });
}
