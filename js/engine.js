// ============================================================
// EggWorld — motor do jogo (lógica pura, sem DOM)
// ============================================================
import {
  BASE, WORLDS, FARM_UPGRADES, SPECIES, SPECIES_BY_ID, MISSIONS,
  WORKSHOP, LAB, COLONY_BONUS, MATERIALS,
} from './data.js';

export const SAVE_VERSION = 1;
export const FARM_COUNT = 5;
const byId = arr => Object.fromEntries(arr.map(x => [x.id, x]));
export const UP = byId(FARM_UPGRADES);
export const WS = byId(WORKSHOP);
export const LABS = byId(LAB);
export const MISSION = byId(MISSIONS);

// ------------------------------------------------------------
// Estado
// ------------------------------------------------------------
export function newFarm(owned = false) {
  return {
    owned,
    chickens: Object.fromEntries(SPECIES.map(s => [s.id, 0])),
    up: Object.fromEntries(FARM_UPGRADES.map(u => [u.id, 0])),
    licenses: { comum: true },
    hatchSpecies: 'comum',
    colonyPct: 0,
    colonyStored: 0,
    earned: 0,
  };
}

export function newState(now = Date.now()) {
  return {
    v: SAVE_VERSION,
    created: now,
    lastTick: now,
    world: 0,
    colonies: 0,
    money: 0,
    gold: 0,
    dna: 0,
    mats: Object.fromEntries(Object.keys(MATERIALS).map(k => [k, 0])),
    farms: Array.from({ length: FARM_COUNT }, (_, i) => newFarm(i === 0)),
    currentFarm: 0,
    ws: Object.fromEntries(WORKSHOP.map(u => [u.id, 0])),
    lab: Object.fromEntries(LAB.map(u => [u.id, 0])),
    genes: {},
    expeditions: [],
    stats: { taps: 0, hatched: 0, earnedTotal: 0, missionsDone: 0, giftsClaimed: 0 },
    gift: { next: now + 60e3, until: 0 },
    settings: { buyQty: 1 },
  };
}

// Garante que saves antigos tenham todos os campos novos
export function migrate(raw, now = Date.now()) {
  const base = newState(now);
  const s = Object.assign(base, raw);
  s.mats = Object.assign(newState(now).mats, raw.mats || {});
  s.ws = Object.assign(newState(now).ws, raw.ws || {});
  s.lab = Object.assign(newState(now).lab, raw.lab || {});
  s.stats = Object.assign(newState(now).stats, raw.stats || {});
  s.settings = Object.assign(newState(now).settings, raw.settings || {});
  s.gift = Object.assign(newState(now).gift, raw.gift || {});
  s.farms = Array.from({ length: FARM_COUNT }, (_, i) => {
    const f = newFarm(i === 0);
    const r = (raw.farms || [])[i] || {};
    return Object.assign(f, r, {
      chickens: Object.assign(f.chickens, r.chickens || {}),
      up: Object.assign(f.up, r.up || {}),
      licenses: Object.assign(f.licenses, r.licenses || {}),
    });
  });
  s.v = SAVE_VERSION;
  return s;
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
export const world = s => WORLDS[s.world];
export const egg = (s, fi) => WORLDS[s.world].eggs[fi];
export const upEffect = (id, lvl) => UP[id].effect(lvl);
export const wsEffect = (s, id) => WS[id].effect(s.ws[id]);
export const labEffect = (s, id) => LABS[id].effect(s.lab[id]);
export const ownedCount = s => s.farms.filter(f => f.owned).length;
export const progressIndex = s => s.colonies * FARM_COUNT + ownedCount(s) - 1;
export const shipCount = s => wsEffect(s, 'hangar');
export const freeShips = s => shipCount(s) - s.expeditions.length;
export const chickenTotal = f => Object.values(f.chickens).reduce((a, b) => a + b, 0);

export function globalMults(s) {
  return {
    value: labEffect(s, 'marketing') * COLONY_BONUS ** s.colonies,
    lay: labEffect(s, 'genetica') * wsEffect(s, 'ninhos'),
    ship: labEffect(s, 'logistica') * wsEffect(s, 'chassi') * wsEffect(s, 'motor'),
    coop: wsEffect(s, 'estrutura'),
    hatch: labEffect(s, 'incubacao'),
  };
}

// Estatísticas completas de uma fazenda
export function farmStats(s, fi, g = globalMults(s)) {
  const farm = s.farms[fi];
  const e = egg(s, fi);
  const u = id => upEffect(id, farm.up[id]);
  const coops = u('coops');
  const cap = Math.floor(BASE.coopCapacity * coops * u('coopCap') * g.coop);
  const count = chickenTotal(farm);
  const layBase = BASE.layPerChicken * u('layRate') * g.lay;
  const eggValue = e.value * u('eggValue') * g.value;
  let eggs = 0, weight = 0, value = 0, breed = 0;
  for (const sp of SPECIES) {
    const n = farm.chickens[sp.id];
    if (!n) continue;
    eggs += n * sp.lay;
    weight += n * sp.lay * sp.weight;
    value += n * sp.lay * sp.value;
    breed += n * sp.breed;
  }
  eggs *= layBase;
  weight *= layBase;
  value *= layBase * eggValue;
  const vehicles = u('fleet');
  const shipCap = vehicles * BASE.vehicleCapacity * u('vehCap') * u('vehSpeed') * g.ship;
  const frac = weight > 0 ? Math.min(1, shipCap / weight) : 1;
  const pct = farm.owned ? farm.colonyPct / 100 : 0;
  const shipped = eggs * frac;
  return {
    cap, count, coops, vehicles,
    layBase, eggValue,
    eggsPerSec: eggs,
    weightPerSec: weight,
    shipCap,
    shipUse: shipCap > 0 ? weight / shipCap : 0,
    frac,
    shippedPerSec: shipped,
    wastedPerSec: eggs - shipped,
    income: farm.owned ? value * frac * (1 - pct) : 0,
    fullIncome: farm.owned ? value * frac : 0,
    colonyRate: shipped * pct,
    tapHatch: Math.max(1, Math.floor(u('hatchTap') * g.hatch)),
    autoHatch: u('autoHatch') * g.hatch,
    breed,
    perChickenIncome: layBase * eggValue, // renda de 1 galinha comum
  };
}

export function totalIncome(s) {
  const g = globalMults(s);
  let t = 0;
  s.farms.forEach((f, i) => { if (f.owned) t += farmStats(s, i, g).income; });
  return t;
}

// ------------------------------------------------------------
// Custos
// ------------------------------------------------------------
export function upgradeCost(s, fi, id, lvl = s.farms[fi].up[id]) {
  const d = UP[id];
  return d.base * egg(s, fi).costScale * d.growth ** lvl;
}

// Custo e quantidade para comprar "qty" níveis (qty = 'max' compra o máximo possível)
export function bulkUpgrade(s, fi, id, qty) {
  const d = UP[id];
  const lvl = s.farms[fi].up[id];
  const room = d.max - lvl;
  let n = 0, cost = 0;
  const limit = qty === 'max' ? room : Math.min(qty, room);
  while (n < limit) {
    const c = upgradeCost(s, fi, id, lvl + n);
    if (qty === 'max' && cost + c > s.money) break;
    cost += c;
    n++;
  }
  if (qty === 'max' && n === 0 && room > 0) return { n: 1, cost: upgradeCost(s, fi, id, lvl) };
  return { n, cost };
}

export function buyUpgrade(s, fi, id, qty = 1) {
  const { n, cost } = bulkUpgrade(s, fi, id, qty);
  if (n <= 0 || cost > s.money) return false;
  s.money -= cost;
  s.farms[fi].up[id] += n;
  return true;
}

export function buyFarm(s, fi) {
  const f = s.farms[fi];
  if (f.owned) return false;
  if (fi > 0 && !s.farms[fi - 1].owned) return false;
  const price = egg(s, fi).price;
  if (s.money < price) return false;
  s.money -= price;
  f.owned = true;
  return true;
}

// ------------------------------------------------------------
// Galinhas
// ------------------------------------------------------------
export function speciesAvailable(s, id) {
  const sp = SPECIES_BY_ID[id];
  return !sp.dna || !!s.genes[id];
}

export function licenseCost(s, fi, id) {
  const sp = SPECIES_BY_ID[id];
  return (sp.license || 0) * egg(s, fi).costScale;
}

export function buyLicense(s, fi, id) {
  const f = s.farms[fi];
  if (f.licenses[id] || !speciesAvailable(s, id)) return false;
  const c = licenseCost(s, fi, id);
  if (s.money < c) return false;
  s.money -= c;
  f.licenses[id] = true;
  return true;
}

export function hatchCost(s, fi, id, st = farmStats(s, fi)) {
  const sp = SPECIES_BY_ID[id];
  return sp.hatchCost * 60 * st.perChickenIncome;
}

// Choca n galinhas da raça escolhida. Se o galinheiro estiver cheio,
// raças especiais substituem galinhas comuns.
export function hatch(s, fi, n, id = s.farms[fi].hatchSpecies) {
  const f = s.farms[fi];
  if (!f.owned || !f.licenses[id]) return 0;
  const st = farmStats(s, fi);
  const free = Math.max(0, st.cap - st.count);
  if (id === 'comum') {
    const k = Math.min(n, free);
    f.chickens.comum += k;
    s.stats.hatched += k;
    return k;
  }
  const price = hatchCost(s, fi, id, st);
  const affordable = price > 0 ? Math.floor(s.money / price) : n;
  let k = Math.min(n, affordable);
  const add = Math.min(k, free);
  const conv = Math.min(k - add, Math.floor(f.chickens.comum));
  k = add + conv;
  if (k <= 0) return 0;
  f.chickens.comum -= conv;
  f.chickens[id] += k;
  s.money -= k * price;
  s.stats.hatched += k;
  return k;
}

export function tap(s, fi = s.currentFarm) {
  const st = farmStats(s, fi);
  s.stats.taps++;
  return hatch(s, fi, st.tapHatch);
}

// ------------------------------------------------------------
// Simulação
// ------------------------------------------------------------
function tickFarm(s, fi, dt, g, out) {
  const f = s.farms[fi];
  if (!f.owned) return;
  const st = farmStats(s, fi, g);
  // crescimento: incubadora + reprodução (sempre galinhas comuns)
  const grow = (st.autoHatch + st.breed) * dt;
  const room = Math.max(0, st.cap - st.count);
  const added = Math.min(grow, room);
  f.chickens.comum += added;
  // renda
  const inc = st.income * dt;
  s.money += inc;
  f.earned += inc;
  s.stats.earnedTotal += inc;
  // nave de colonização
  if (st.colonyRate > 0) {
    const goal = egg(s, fi).colonyGoal;
    f.colonyStored = Math.min(goal, f.colonyStored + st.colonyRate * dt);
    if (f.colonyStored >= goal) {
      f.colonyPct = 0;
      out && out.events.push({ type: 'colonyFull', farm: fi });
    }
  }
  if (out) {
    out.earned += inc;
    out.chickens += added;
    out.colony += st.colonyRate * dt;
  }
}

export function tick(s, dt, out = null) {
  const g = globalMults(s);
  for (let i = 0; i < FARM_COUNT; i++) tickFarm(s, i, dt, g, out);
}

export function offlineCap(s) {
  return wsEffect(s, 'silo') * BASE.siloMinutes * 60 * wsEffect(s, 'isolamento');
}

// Aplica um período longo (app fechado). Retorna um resumo.
export function simulateOffline(s, seconds) {
  const cap = offlineCap(s);
  const eff = Math.min(seconds, cap);
  const out = { seconds, simulated: eff, capped: seconds > cap, earned: 0, chickens: 0, colony: 0, events: [] };
  if (eff <= 0) return out;
  const steps = Math.min(400, Math.max(10, Math.ceil(eff / 15)));
  const dt = eff / steps;
  for (let i = 0; i < steps; i++) tick(s, dt, out);
  return out;
}

// ------------------------------------------------------------
// Colonização
// ------------------------------------------------------------
export function colonyProgress(s) {
  return s.farms.map((f, i) => ({ stored: f.colonyStored, goal: egg(s, i).colonyGoal }));
}
export function canColonize(s) {
  return colonyProgress(s).every(p => p.stored >= p.goal);
}
export function colonizeReward(s) {
  return 25 * (s.world + 1) * (1 + s.colonies);
}
export function colonize(s) {
  if (!canColonize(s)) return false;
  s.gold += colonizeReward(s);
  s.colonies++;
  s.world = Math.min(s.world + 1, WORLDS.length - 1);
  s.money = 0;
  s.farms = Array.from({ length: FARM_COUNT }, (_, i) => newFarm(i === 0));
  s.currentFarm = 0;
  return true;
}

// ------------------------------------------------------------
// Oficina, Laboratório e Genética
// ------------------------------------------------------------
export function wsCost(s, id) {
  const d = WS[id];
  const lvl = s.ws[id];
  const c = {};
  for (const [k, v] of Object.entries(d.cost)) c[k] = Math.ceil(v * d.growth ** lvl);
  return c;
}
export function canPayMats(s, cost) {
  return Object.entries(cost).every(([k, v]) => (s.mats[k] || 0) >= v);
}
export function buyWorkshop(s, id) {
  const d = WS[id];
  if (s.ws[id] >= d.max) return false;
  const c = wsCost(s, id);
  if (!canPayMats(s, c)) return false;
  for (const [k, v] of Object.entries(c)) s.mats[k] -= v;
  s.ws[id]++;
  return true;
}

export function labCost(s, id) {
  const d = LABS[id];
  return Math.ceil(d.base * d.growth ** s.lab[id]);
}
export function buyLab(s, id) {
  const d = LABS[id];
  if (s.lab[id] >= d.max) return false;
  const c = labCost(s, id);
  if (s.gold < c) return false;
  s.gold -= c;
  s.lab[id]++;
  return true;
}

export function unlockGene(s, id) {
  const sp = SPECIES_BY_ID[id];
  if (!sp.dna || s.genes[id] || s.dna < sp.dna) return false;
  s.dna -= sp.dna;
  s.genes[id] = true;
  return true;
}

// ------------------------------------------------------------
// Exploração
// ------------------------------------------------------------
export function missionUnlocked(s, id) {
  return progressIndex(s) >= MISSION[id].req;
}
export function missionDuration(s, id) {
  return MISSION[id].minutes * 60 * labEffect(s, 'propulsao');
}
export function missionScale(s) {
  return labEffect(s, 'radar') * (1 + 0.5 * s.world);
}

function rollRewards(s, id, rng = Math.random) {
  const scale = missionScale(s);
  const r = {};
  for (const [k, [a, b]] of Object.entries(MISSION[id].rewards)) {
    const raw = (a + rng() * (b - a + 1)) * scale;
    let n = Math.floor(raw);
    if (rng() < raw - n) n++;
    if (n > 0) r[k] = n;
  }
  return r;
}

export function launchMission(s, id, now = Date.now(), rng = Math.random) {
  if (freeShips(s) <= 0 || !missionUnlocked(s, id)) return false;
  const dur = missionDuration(s, id) * 1000;
  s.expeditions.push({ id, start: now, end: now + dur, rewards: rollRewards(s, id, rng) });
  return true;
}

export function grantRewards(s, r) {
  for (const [k, v] of Object.entries(r)) {
    if (k === 'gold') s.gold += v;
    else if (k === 'dna') s.dna += v;
    else if (k === 'money') s.money += v;
    else s.mats[k] = (s.mats[k] || 0) + v;
  }
}

export function collectMission(s, idx, now = Date.now()) {
  const ex = s.expeditions[idx];
  if (!ex || now < ex.end) return null;
  s.expeditions.splice(idx, 1);
  grantRewards(s, ex.rewards);
  s.stats.missionsDone++;
  return ex;
}

// ------------------------------------------------------------
// Presente voador (pequeno bônus aleatório)
// ------------------------------------------------------------
export function giftReward(s, rng = Math.random) {
  const roll = rng();
  const inc = totalIncome(s);
  if (roll < 0.7) {
    const secs = 60 + rng() * 120;
    return { money: Math.max(inc * secs, egg(s, 0).value * 25) };
  }
  if (roll < 0.9) {
    const k = rng() < 0.5 ? 'metal' : 'fibra';
    return { [k]: 2 + Math.floor(rng() * 4) };
  }
  return { gold: 1 + Math.floor(rng() * 2) };
}
