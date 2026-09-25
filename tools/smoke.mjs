// Teste de fumaça: abre o jogo num celular simulado, joga um pouco e tira prints.
// Uso: (servidor rodando em :8080) node tools/smoke.mjs [pasta-de-saida]
import { chromium, devices } from 'playwright';
const out = process.argv[2] || 'shots';
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['Pixel 7'] });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto('http://localhost:8080/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/01-help.png` });
await page.click('[data-act=close]');
// segura o botão de chocar por 2s
const b = await page.locator('[data-hold=hatch]').boundingBox();
await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
await page.mouse.down(); await page.waitForTimeout(2000); await page.mouse.up();
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/02-farm.png` });
// dá dinheiro e recursos para testar as telas
await page.evaluate(() => { const S = window.egg.S; S.money = 5e4; S.gold = 40; S.dna = 6; S.mats = { metal: 80, cristal: 40, fibra: 60, nucleo: 3 }; });
await page.click('[data-tab=upgrades]'); await page.waitForTimeout(400);
for (let i = 0; i < 3; i++) await page.click('[data-act=buyUp][data-id=eggValue]');
await page.click('[data-act=buyUp][data-id=coops]');
await page.click('[data-act=buyUp][data-id=autoHatch]');
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/03-upgrades.png`, fullPage: false });
await page.click('[data-act=buyFarm][data-i="1"]'); await page.waitForTimeout(400);
await page.click('[data-tab=chickens]'); await page.waitForTimeout(400);
await page.click('[data-act=farm][data-i="0"]'); await page.waitForTimeout(300);
await page.click('[data-act=license][data-sp=pluma]'); await page.waitForTimeout(300);
await page.click('[data-act=gene][data-sp=turbo]'); await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/04-chickens-modal.png` });
await page.click('[data-act=close]');
await page.screenshot({ path: `${out}/05-chickens.png` });
await page.click('[data-tab=ships]'); await page.waitForTimeout(300);
await page.click('[data-act=launch][data-id=asteroides]'); await page.waitForTimeout(300);
await page.click('[data-act=pct][data-i="0"][data-d="10"]'); await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/06-ships.png` });
await page.click('[data-tab=base]'); await page.waitForTimeout(300);
await page.click('[data-act=ws][data-id=silo]'); await page.waitForTimeout(300);
await page.click('[data-act=lab][data-id=marketing]'); await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/07-base.png` });
await page.click('[data-tab=farm]'); await page.waitForTimeout(300);
await page.click('[data-act=pickSpecies][data-sp=pluma]'); await page.waitForTimeout(300);
await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
await page.mouse.down(); await page.waitForTimeout(800); await page.mouse.up();
// simula 2h fora do app
await page.evaluate(() => { const S = window.egg.S; S.lastTick -= 2 * 3600e3; S.expeditions.forEach(x => { x.end -= 3600e3; }); });
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/08-offline.png` });
await page.click('[data-act=close]');
await page.click('[data-tab=ships]'); await page.waitForTimeout(400);
await page.click('[data-act=collect]'); await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/09-collected.png` });
// testa colonização
await page.evaluate(() => { const S = window.egg.S; S.farms.forEach((f, i) => { f.owned = true; f.colonyStored = window.egg.E.egg(S, i).colonyGoal; }); });
await page.waitForTimeout(400);
await page.click('[data-act=colonize]'); await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/10-colonize.png` });
await page.click('[data-act=colonizeGo]'); await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/11-world2.png` });
await page.click('[data-act=close]');
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/12-world2-farm.png` });
// save persiste após recarregar
await page.evaluate(() => { document.dispatchEvent(new Event('visibilitychange')); });
await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(500);
const world = await page.evaluate(() => window.egg.S.world);
console.log('mundo após recarregar:', world);
console.log(errors.length ? errors.join('\n') : 'sem erros no console');
await browser.close();
