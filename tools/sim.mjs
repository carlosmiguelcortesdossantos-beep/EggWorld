// Simulador de balanceamento: um jogador "guloso" que compra a melhor
// melhoria disponível. Uso: node tools/sim.mjs [horas] [toques/s]
import * as E from '../js/engine.js';
import { FARM_UPGRADES, WORLDS } from '../js/data.js';
import { fmt, time } from '../js/format.js';

const HOURS = +(process.argv[2] || 24);
const TAPS = +(process.argv[3] || 0.5);
const s = E.newState(0);
let rng = 1; const rand = () => (rng = (rng * 16807) % 2147483647) / 2147483647;

function potential(s) {
  // renda se todas as fazendas estivessem cheias
  const g = E.globalMults(s);
  let t = 0;
  s.farms.forEach((f, i) => {
    if (!f.owned) return;
    const c = f.chickens.comum; const st0 = E.farmStats(s, i, g);
    f.chickens.comum += Math.max(0, st0.cap - st0.count);
    t += E.farmStats(s, i, g).fullIncome;
    f.chickens.comum = c;
  });
  return t;
}

const log = [];
let t = 0; const dt = 1;
let colonizing = false;
const end = HOURS * 3600;
let lastMission = 0;
while (t < end) {
  // toques
  if (rand() < TAPS) {
    // toca na fazenda com mais espaço livre (relativo)
    let bi = 0, bv = -1;
    s.farms.forEach((f, i) => { if (!f.owned) return; const st = E.farmStats(s, i); const v = 1 - st.count / st.cap; if (v > bv) { bv = v; bi = i; } });
    E.tap(s, bi);
  }
  E.tick(s, dt);
  t += dt;
  const now = t * 1000;
  // missões
  for (let i = s.expeditions.length - 1; i >= 0; i--) E.collectMission(s, i, now);
  for (const m of ['selvagem', 'ruinas', 'floresta', 'luas', 'asteroides'])
    if (E.missionUnlocked(s, m) && E.freeShips(s) > 0) E.launchMission(s, m, now, rand);
  for (const w of ['silo', 'hangar', 'chassi', 'estrutura', 'motor', 'ninhos', 'isolamento']) E.buyWorkshop(s, w);
  for (const l of ['marketing', 'genetica', 'logistica', 'radar', 'propulsao', 'incubacao']) E.buyLab(s, l);
  for (const gsp of ['turbo', 'cosmica', 'fenix']) E.unlockGene(s, gsp);

  if (t % 2 !== 0) continue;
  const inc = E.totalIncome(s);
  // próxima fazenda
  const nf = s.farms.findIndex(f => !f.owned);
  if (nf > 0) {
    const price = E.egg(s, nf).price;
    if (s.money >= price) { E.buyFarm(s, nf); s.currentFarm = nf; log.push(`${time(t)}  comprou fazenda ${nf + 1} (${E.egg(s, nf).name}) renda ${fmt(inc)}/s`); continue; }
    if (price / Math.max(inc, 1e-9) < 600) continue; // economizando
  }
  // colonização: com todas as fazendas, desvia 50%
  if (!colonizing && nf === -1) {
    colonizing = true;
    s.farms.forEach(f => f.colonyPct = 50);
    log.push(`${time(t)}  começou a encher a nave de colonização`);
    s.farms.forEach((f, i) => { const st = E.farmStats(s, i); log.push(`    F${i + 1} ovos entregues ${fmt(st.shippedPerSec)}/s -> nave ${fmt(st.colonyRate)}/s meta ${fmt(E.egg(s, i).colonyGoal)} (${time(E.egg(s, i).colonyGoal / Math.max(st.colonyRate, 1e-9))})`); });
  }
  if (E.canColonize(s)) {
    log.push(`${time(t)}  COLONIZOU ${E.world(s).name} (+${E.colonizeReward(s)} ouro)`);
    E.colonize(s); colonizing = false;
    if (process.env.ONE) break;
    continue;
  }
  // melhor melhoria
  const base = potential(s);
  let best = null;
  s.farms.forEach((f, fi) => {
    if (!f.owned) return;
    const st = E.farmStats(s, fi);
    for (const u of FARM_UPGRADES) {
      if (f.up[u.id] >= u.max) continue;
      const c = E.upgradeCost(s, fi, u.id);
      if (c > s.money) continue;
      let score;
      if (u.id === 'hatchTap' || u.id === 'autoHatch') {
        const fill = (st.cap - st.count) / Math.max(st.autoHatch + st.breed, 1e-9);
        score = fill > 120 ? Infinity : 0;
      } else {
        f.up[u.id]++; const p = potential(s); f.up[u.id]--;
        score = (p - base) / c;
      }
      if (!best || score > best.score) best = { score, fi, id: u.id };
    }
    // licenças / chocar especiais se transporte for gargalo
    if (st.shipUse > 1.05 && f.licenses.pluma) f.hatchSpecies = 'pluma';
    else if (!f.licenses.pluma && E.licenseCost(s, fi, 'pluma') < s.money * 0.3) E.buyLicense(s, fi, 'pluma');
  });
  if (best && best.score > 0) E.buyUpgrade(s, best.fi, best.id, 1);
}
console.log(log.join('\n'));
console.log('---');
console.log(`Tempo: ${time(t)} | mundo ${s.world + 1} | dinheiro ${fmt(s.money)} | renda ${fmt(E.totalIncome(s))}/s`);
console.log(`ouro ${s.gold} dna ${s.dna} mats ${JSON.stringify(s.mats)} ws ${JSON.stringify(s.ws)}`);
s.farms.forEach((f, i) => { if (!f.owned) return; const st = E.farmStats(s, i); console.log(`F${i + 1} galinhas ${fmt(st.count)}/${fmt(st.cap)} uso transporte ${(st.shipUse * 100).toFixed(0)}% renda ${fmt(st.income)}/s nave ${fmt(f.colonyStored)}/${fmt(E.egg(s, i).colonyGoal)} up ${JSON.stringify(f.up)}`); });
