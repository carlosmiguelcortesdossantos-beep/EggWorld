// ============================================================
// EggWorld — dados do jogo (mundos, ovos, galinhas, melhorias)
// Tudo que é "balanceamento" fica aqui para ser fácil de ajustar.
// ============================================================
import * as F from './format.js';

// Constantes base da fazenda
export const BASE = {
  layPerChicken: 0.025,  // ovos por segundo por galinha (1,5/min)
  coopCapacity: 100,     // galinhas por galinheiro
  vehicleCapacity: 2,    // "unidades de peso" por segundo por veículo
  tapHatch: 2,           // galinhas por toque
  siloMinutes: 60,       // minutos offline por silo
  maxSilos: 10,
  startShips: 1,
  maxShips: 6,
};

// ------------------------------------------------------------
// Mundos. Cada mundo tem 5 ovos (fazendas). Valores crescem por
// fazenda; o custo das melhorias escala junto com o valor do ovo.
// ------------------------------------------------------------
const FARM_VALUE = [1, 20, 400, 8000, 160000];
const FARM_PRICE = [0, 4e3, 2e6, 8e8, 1e11];
// Fazendas mais avançadas têm melhorias proporcionalmente mais caras
const FARM_COST_FACTOR = [1, 3, 10, 30, 100];
// Ovos a estocar na nave de colonização (por fazenda) no primeiro mundo
const COLONY_BASE = [2e8, 1.3e8, 8e7, 4e7, 1.5e7];

export const WORLDS = [
  {
    id: 'vale', name: 'Vale Verde', desc: 'Um planeta calmo, perfeito para começar a sua granja.',
    sky: ['#8fd3ff', '#d8f3ff'], ground: '#7cc26b', accent: '#4caf50',
    eggs: [
      { id: 'caipira', name: 'Ovo Caipira', colors: ['#f3e2c7', '#d9b98b'] },
      { id: 'codorna', name: 'Ovo de Codorna', colors: ['#efe6d6', '#6b5a45'], spots: true },
      { id: 'azul', name: 'Ovo Azul', colors: ['#bfe4ea', '#7fb9c4'] },
      { id: 'mel', name: 'Ovo de Mel', colors: ['#ffd36e', '#e59a1c'] },
      { id: 'jade', name: 'Ovo de Jade', colors: ['#8ee3b0', '#2e9e67'] },
    ],
  },
  {
    id: 'rubro', name: 'Deserto Rubro', desc: 'Calor, poeira vermelha e ovos que brilham ao sol.',
    sky: ['#ffb38a', '#ffe0c7'], ground: '#c8643c', accent: '#e8643c',
    eggs: [
      { id: 'areia', name: 'Ovo de Areia', colors: ['#f0d19a', '#c9a061'], spots: true },
      { id: 'ferro', name: 'Ovo de Ferro', colors: ['#b9c0c9', '#6b7480'] },
      { id: 'rubi', name: 'Ovo Rubi', colors: ['#ff7a8a', '#c21e3a'] },
      { id: 'solar', name: 'Ovo Solar', colors: ['#fff27a', '#ff9d00'] },
      { id: 'magma', name: 'Ovo de Magma', colors: ['#ff8a3d', '#5a1a0a'], spots: true },
    ],
  },
  {
    id: 'oceano', name: 'Oceano Profundo', desc: 'Granjas flutuantes sobre um mar sem fim.',
    sky: ['#5ab0e8', '#bfe8ff'], ground: '#2f7fb3', accent: '#1e88e5',
    eggs: [
      { id: 'perola', name: 'Ovo de Pérola', colors: ['#ffffff', '#d7d2e8'] },
      { id: 'coral', name: 'Ovo Coral', colors: ['#ffb0a0', '#ff6f61'], spots: true },
      { id: 'mare', name: 'Ovo Maré', colors: ['#8ff0e8', '#1aa39a'] },
      { id: 'abissal', name: 'Ovo Abissal', colors: ['#4a5ad6', '#12163f'] },
      { id: 'leviata', name: 'Ovo Leviatã', colors: ['#6ef0c2', '#0b5f6e'], spots: true },
    ],
  },
  {
    id: 'gelo', name: 'Gelo Eterno', desc: 'Um mundo congelado onde só as galinhas mais fortes prosperam.',
    sky: ['#c9e6ff', '#f2f9ff'], ground: '#e6f2fb', accent: '#64b5f6',
    eggs: [
      { id: 'neve', name: 'Ovo de Neve', colors: ['#ffffff', '#cfe3f3'] },
      { id: 'glacial', name: 'Ovo Glacial', colors: ['#b8f1ff', '#4fb7d9'] },
      { id: 'aurora', name: 'Ovo Aurora', colors: ['#a6ffcb', '#8f6bff'] },
      { id: 'diamante', name: 'Ovo Diamante', colors: ['#f4fdff', '#8fd7ff'], spots: true },
      { id: 'cometa', name: 'Ovo Cometa', colors: ['#d1e9ff', '#3b4c9b'], spots: true },
    ],
  },
  {
    id: 'nebulosa', name: 'Nebulosa Cósmica', desc: 'A fronteira final. Ovos feitos de pura energia estelar.',
    sky: ['#2a1650', '#6a3fa0'], ground: '#3c2a6e', accent: '#b388ff',
    eggs: [
      { id: 'estelar', name: 'Ovo Estelar', colors: ['#fff6a8', '#f0a500'], spots: true },
      { id: 'quantico', name: 'Ovo Quântico', colors: ['#7ff5ff', '#8a2be2'] },
      { id: 'supernova', name: 'Ovo Supernova', colors: ['#ffdf6e', '#ff2d55'] },
      { id: 'buraconegro', name: 'Ovo Buraco Negro', colors: ['#6b5b95', '#050508'] },
      { id: 'infinito', name: 'Ovo Infinito', colors: ['#ffffff', '#ff00d4'], spots: true },
    ],
  },
];

// Escala por mundo: números maiores e mundos progressivamente mais difíceis
const WORLD_SCALE = 1e4;         // valor dos ovos
const WORLD_COST_EXTRA = 4;      // custos crescem 4x mais que o valor, por mundo
const COLONY_WORLD_GROWTH = 3;   // meta da nave cresce 3x por mundo

WORLDS.forEach((w, wi) => {
  const vs = WORLD_SCALE ** wi;
  const cs = vs * WORLD_COST_EXTRA ** wi;
  w.eggs.forEach((e, fi) => {
    e.value = FARM_VALUE[fi] * vs;
    e.price = FARM_PRICE[fi] * cs;
    e.costScale = FARM_VALUE[fi] * FARM_COST_FACTOR[fi] * cs;
    e.colonyGoal = COLONY_BASE[fi] * COLONY_WORLD_GROWTH ** wi;
  });
});

// ------------------------------------------------------------
// Melhorias da fazenda (compradas com dinheiro, por fazenda)
// custo = base * costScale * growth^nível
// ------------------------------------------------------------
export const FARM_UPGRADES = [
  // Ovos
  { id: 'eggValue', group: 'Ovos', icon: '💰', name: 'Preço do ovo', desc: 'Ovos valem +12% (acumulativo).',
    base: 12, growth: 1.6, max: 80, effect: l => 1.12 ** l, fmt: v => `x${fmtMult(v)} valor` },
  { id: 'layRate', group: 'Ovos', icon: '🥚', name: 'Ração turbinada', desc: 'Galinhas botam +8% mais rápido (acumulativo).',
    base: 18, growth: 1.55, max: 80, effect: l => 1.08 ** l, fmt: v => `x${fmtMult(v)} postura` },
  // Galinheiros
  { id: 'coopCap', group: 'Galinheiros', icon: '🏠', name: 'Ampliar galinheiros', desc: 'Cada galinheiro comporta +15% galinhas (acumulativo).',
    base: 20, growth: 1.55, max: 80, effect: l => 1.15 ** l, fmt: v => `x${fmtMult(v)} capacidade` },
  { id: 'coops', group: 'Galinheiros', icon: '🏘️', name: 'Novo galinheiro', desc: 'Constrói mais um galinheiro.',
    base: 150, growth: 6, max: 9, effect: l => 1 + l, fmt: v => `${v} galinheiro(s)` },
  // Chocadeira
  { id: 'hatchTap', group: 'Chocadeira', icon: '🐣', name: 'Chocadeira', desc: 'Mais galinhas por toque.',
    base: 15, growth: 1.55, max: 50, effect: l => BASE.tapHatch + l + Math.floor(BASE.tapHatch * 1.4 ** l) - BASE.tapHatch, fmt: v => `${fmtInt(v)} por toque` },
  { id: 'autoHatch', group: 'Chocadeira', icon: '⚙️', name: 'Incubadora automática', desc: 'Choca galinhas sozinha, mesmo offline.',
    base: 40, growth: 1.6, max: 50, effect: l => (l === 0 ? 0 : 0.5 * 1.4 ** (l - 1)), fmt: v => `${fmtNum(v)}/s` },
  // Transporte
  { id: 'vehCap', group: 'Transporte', icon: '📦', name: 'Caçamba maior', desc: 'Veículos carregam +15% por viagem (acumulativo).',
    base: 16, growth: 1.55, max: 80, effect: l => 1.15 ** l, fmt: v => `x${fmtMult(v)} carga` },
  { id: 'vehSpeed', group: 'Transporte', icon: '⚡', name: 'Entregas rápidas', desc: 'Veículos andam +8% mais rápido (acumulativo).',
    base: 30, growth: 1.6, max: 60, effect: l => 1.08 ** l, fmt: v => `x${fmtMult(v)} velocidade` },
  { id: 'fleet', group: 'Transporte', icon: '🚚', name: 'Novo veículo', desc: 'Amplia a frota de entregas.',
    base: 100, growth: 4.5, max: 11, effect: l => 1 + l, fmt: v => `${v} veículo(s)` },
];

// ------------------------------------------------------------
// Raças de galinha.
//  lay: multiplicador de postura | value: multiplicador do valor do ovo
//  weight: espaço que o ovo ocupa no transporte | breed: galinhas geradas/s
//  hatchCost: custo por galinha (em "minutos de renda de uma galinha comum")
//  license: custo único para liberar a raça na fazenda (x costScale)
//  dna: amostras genéticas necessárias (raças de exploração)
// ------------------------------------------------------------
export const SPECIES = [
  { id: 'comum', name: 'Galinha Comum', emoji: '🐔', hue: 0, lay: 1, value: 1, weight: 1, breed: 0,
    hatchCost: 0, desc: 'Confiável e de graça. A base de toda granja.' },
  { id: 'fertil', name: 'Galinha Reprodutora', emoji: '🐔', hue: 290, lay: 0.8, value: 1, weight: 1, breed: 0.02,
    hatchCost: 6, license: 400, desc: 'Gera galinhas comuns sozinha (inclusive offline). Bota um pouco menos.' },
  { id: 'dourada', name: 'Galinha Dourada', emoji: '🐔', hue: 45, lay: 0.7, value: 3, weight: 1, breed: 0,
    hatchCost: 10, license: 1500, desc: 'Ovo 3x mais caro. Ótima quando o transporte é o gargalo.' },
  { id: 'pluma', name: 'Galinha Pluma', emoji: '🐔', hue: 160, lay: 1, value: 1, weight: 0.35, breed: 0,
    hatchCost: 5, license: 900, desc: 'Ovo superleve e igualmente nutritivo: ocupa só 35% do espaço nos veículos.' },
  // Raças descobertas pelas naves de exploração (genética)
  { id: 'turbo', name: 'Galinha Turbo', emoji: '🐓', hue: 330, lay: 2.2, value: 1, weight: 1.1, breed: 0,
    hatchCost: 14, license: 3000, dna: 5, desc: 'Genética alienígena: bota mais que o dobro, mas ovos um pouco mais pesados.' },
  { id: 'cosmica', name: 'Galinha Cósmica', emoji: '🐓', hue: 220, lay: 1, value: 2.5, weight: 0.5, breed: 0,
    hatchCost: 22, license: 8000, dna: 12, desc: 'Ovos valiosos e leves. Encontrada em nebulosas.' },
  { id: 'fenix', name: 'Galinha Fênix', emoji: '🐓', hue: 15, lay: 1.3, value: 2, weight: 0.8, breed: 0.012,
    hatchCost: 40, license: 25000, dna: 25, desc: 'Lendária. Renasce em novas galinhas e bota ovos flamejantes.' },
];
export const SPECIES_BY_ID = Object.fromEntries(SPECIES.map(s => [s.id, s]));

// ------------------------------------------------------------
// Materiais e recompensas da exploração
// ------------------------------------------------------------
export const MATERIALS = {
  metal: { name: 'Metal', icon: '🔩' },
  cristal: { name: 'Cristal', icon: '💎' },
  fibra: { name: 'Fibra', icon: '🧵' },
  nucleo: { name: 'Núcleo', icon: '🔮' },
};

// Missões de exploração: duração em minutos, recompensas [min,max]
export const MISSIONS = [
  { id: 'asteroides', name: 'Cinturão de Asteroides', icon: '☄️', minutes: 5, req: 0,
    desc: 'Viagem curta para garimpar metal.',
    rewards: { metal: [6, 12], gold: [0, 1] } },
  { id: 'luas', name: 'Luas de Gelo', icon: '🌙', minutes: 20, req: 1,
    desc: 'Cristais congelados e um pouco de metal.',
    rewards: { cristal: [5, 10], metal: [4, 8], gold: [0, 2] } },
  { id: 'floresta', name: 'Floresta Nebular', icon: '🌿', minutes: 45, req: 2,
    desc: 'Fibras vegetais e, com sorte, amostras de DNA.',
    rewards: { fibra: [8, 16], metal: [2, 5], dna: [0, 1], gold: [1, 3] } },
  { id: 'ruinas', name: 'Ruínas Ancestrais', icon: '🏛️', minutes: 120, req: 3,
    desc: 'Tesouros de uma civilização perdida: ouro e núcleos.',
    rewards: { gold: [6, 14], nucleo: [1, 3], cristal: [4, 8], metal: [5, 10] } },
  { id: 'selvagem', name: 'Planeta Selvagem', icon: '🦖', minutes: 240, req: 4,
    desc: 'Fauna estranha. Muito DNA para novas raças.',
    rewards: { dna: [2, 4], fibra: [10, 20], metal: [6, 12], gold: [4, 10], nucleo: [0, 2] } },
];

// ------------------------------------------------------------
// Oficina: melhorias permanentes pagas com materiais
// ------------------------------------------------------------
export const WORKSHOP = [
  { id: 'chassi', group: 'Veículos', icon: '🚛', name: 'Chassi de liga', desc: '+20% capacidade de todos os veículos.',
    cost: { metal: 10, fibra: 3 }, growth: 1.6, max: 30, effect: l => 1 + 0.2 * l, fmt: v => `x${fmtMult(v)} carga` },
  { id: 'motor', group: 'Veículos', icon: '🛞', name: 'Motor iônico', desc: '+15% velocidade de todos os veículos.',
    cost: { metal: 8, cristal: 5 }, growth: 1.6, max: 30, effect: l => 1 + 0.15 * l, fmt: v => `x${fmtMult(v)} velocidade` },
  { id: 'estrutura', group: 'Galinheiros', icon: '🏗️', name: 'Estrutura modular', desc: '+20% capacidade de todos os galinheiros.',
    cost: { metal: 12, fibra: 6 }, growth: 1.6, max: 30, effect: l => 1 + 0.2 * l, fmt: v => `x${fmtMult(v)} capacidade` },
  { id: 'ninhos', group: 'Galinheiros', icon: '🪺', name: 'Ninhos de cristal', desc: '+10% postura em todas as fazendas.',
    cost: { cristal: 10, fibra: 4 }, growth: 1.65, max: 30, effect: l => 1 + 0.1 * l, fmt: v => `x${fmtMult(v)} postura` },
  { id: 'silo', group: 'Silos', icon: '🛢️', name: 'Construir silo', desc: 'Cada silo mantém a granja funcionando por mais tempo offline.',
    cost: { metal: 15, fibra: 10 }, growth: 1.9, max: BASE.maxSilos - 1, effect: l => 1 + l, fmt: v => `${v} silo(s)` },
  { id: 'isolamento', group: 'Silos', icon: '🧊', name: 'Isolamento térmico', desc: '+25% de tempo por silo.',
    cost: { cristal: 8, fibra: 8 }, growth: 1.7, max: 20, effect: l => 1 + 0.25 * l, fmt: v => `x${fmtMult(v)} tempo` },
  { id: 'hangar', group: 'Hangar', icon: '🛸', name: 'Nova nave de exploração', desc: 'Mais uma nave para missões simultâneas.',
    cost: { metal: 25, cristal: 10, nucleo: 1 }, growth: 2.2, max: BASE.maxShips - BASE.startShips, effect: l => BASE.startShips + l, fmt: v => `${v} nave(s)` },
];

// ------------------------------------------------------------
// Laboratório: melhorias permanentes pagas com ouro espacial
// ------------------------------------------------------------
export const LAB = [
  { id: 'marketing', icon: '📣', name: 'Marketing galáctico', desc: '+10% valor de todos os ovos.',
    base: 5, growth: 1.5, max: 50, effect: l => 1.1 ** l, fmt: v => `x${fmtMult(v)} valor` },
  { id: 'genetica', icon: '🧬', name: 'Genética avançada', desc: '+10% postura de todas as galinhas.',
    base: 5, growth: 1.5, max: 50, effect: l => 1.1 ** l, fmt: v => `x${fmtMult(v)} postura` },
  { id: 'logistica', icon: '🛰️', name: 'Logística quântica', desc: '+10% capacidade de entrega.',
    base: 5, growth: 1.5, max: 50, effect: l => 1.1 ** l, fmt: v => `x${fmtMult(v)} entrega` },
  { id: 'propulsao', icon: '🚀', name: 'Propulsão de dobra', desc: 'Missões 8% mais curtas.',
    base: 8, growth: 1.6, max: 20, effect: l => 0.92 ** l, fmt: v => `x${fmtMult(v)} duração` },
  { id: 'radar', icon: '📡', name: 'Radar profundo', desc: '+15% recompensas das missões.',
    base: 8, growth: 1.6, max: 30, effect: l => 1 + 0.15 * l, fmt: v => `x${fmtMult(v)} recompensas` },
  { id: 'incubacao', icon: '🌡️', name: 'Incubação perfeita', desc: '+20% em chocadeira e incubadora.',
    base: 6, growth: 1.55, max: 40, effect: l => 1 + 0.2 * l, fmt: v => `x${fmtMult(v)} chocagem` },
];

// Bônus permanente por colonização concluída
export const COLONY_BONUS = 2; // renda x2 por mundo colonizado

// Formatação usada nos textos de efeito
function fmtMult(v) { return F.mult(v); }
function fmtInt(v) { return F.int(v); }
function fmtNum(v) { return F.fmt(v, 1); }
