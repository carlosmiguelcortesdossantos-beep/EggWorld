// ============================================================
// EggWorld — inicialização e loop principal
// ============================================================
import * as E from './engine.js';
import * as UI from './ui.js';
import { load, save, wipe, exportCode, importCode } from './save.js';
import { fmt, money, int, time } from './format.js';

let { state: S, fresh } = load();
const OFFLINE_THRESHOLD = 10;   // segundos sem tick = tratado como "offline"
const TICK_MS = 100;
const RENDER_MS = 250;
const SAVE_MS = 5000;

function persist() { S.lastTick = Date.now(); save(S); }

// Aplica o tempo que passou desde o último tick
function catchUp(showSummary) {
  const now = Date.now();
  const gap = (now - S.lastTick) / 1000;
  S.lastTick = now;
  if (gap <= 0) return;
  if (gap < OFFLINE_THRESHOLD) { E.tick(S, gap); return; }
  const done = S.expeditions.filter(x => now >= x.end).length;
  const r = E.simulateOffline(S, gap);
  if (showSummary && gap >= 60) offlineModal(r, done);
}

function offlineModal(r, missionsDone) {
  UI.modal(`<div class="emoji">🌙</div><h2 class="center">Bem-vindo de volta!</h2>
    <p class="center muted small">Você ficou fora por ${time(r.seconds)}.</p>
    <div class="kv"><span>🛢️ Silos mantiveram a granja por</span><span>${time(r.simulated)}</span></div>
    <div class="kv"><span>💵 Dinheiro ganho</span><span>${money(r.earned)}</span></div>
    ${r.chickens >= 1 ? `<div class="kv"><span>🐣 Novas galinhas</span><span>${int(r.chickens)}</span></div>` : ''}
    ${r.colony >= 1 ? `<div class="kv"><span>🚀 Ovos para a nave</span><span>${fmt(r.colony)}</span></div>` : ''}
    ${missionsDone ? `<div class="kv"><span>🛸 Naves de volta</span><span>${missionsDone}</span></div>` : ''}
    ${r.capped ? `<p class="small" style="color:#b3263a;font-weight:700">A ração dos silos acabou antes de você voltar. Construa mais silos na 🔧 Oficina para ficar mais tempo fora.</p>` : ''}
    <div class="modal-actions"><button class="btn" data-act="close">Coletar</button></div>`);
}

// Presente voador
function checkGift(now) {
  if (now >= S.gift.next) {
    S.gift.next = now + (70 + Math.random() * 110) * 1000;
    if (!document.hidden) UI.showGift();
  }
}
window.addEventListener('egg:gift', () => {
  const r = E.giftReward(S);
  E.grantRewards(S, r);
  S.stats.giftsClaimed++;
  UI.giftToast(r);
});

// Eventos vindos da interface
window.addEventListener('egg:reset', () => {
  wipe();
  S = E.newState();
  UI.setState(S);
  persist();
  UI.showHelp();
});
window.addEventListener('egg:export', e => { persist(); e.detail(exportCode(S)); });
window.addEventListener('egg:import', e => {
  try {
    S = importCode(e.detail);
    S.lastTick = Date.now();
    UI.closeModal();
    UI.setState(S);
    persist();
    UI.toast('✅ Save importado!');
  } catch (err) {
    UI.toast('❌ Código inválido');
  }
});

// Salvar ao sair / voltar para o app
document.addEventListener('visibilitychange', () => {
  if (document.hidden) persist();
  else { catchUp(true); UI.renderAll(); }
});
window.addEventListener('pagehide', persist);

// ------------------------------------------------------------
// Início
// ------------------------------------------------------------
UI.init(S, persist);
if (fresh) UI.showHelp();
else catchUp(true);

setInterval(() => {
  catchUp(true);
  checkGift(Date.now());
}, TICK_MS);
setInterval(() => UI.renderAll(), RENDER_MS);
setInterval(persist, SAVE_MS);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// Acesso pelo console para testes: window.egg.S
window.egg = { get S() { return S; }, E };
