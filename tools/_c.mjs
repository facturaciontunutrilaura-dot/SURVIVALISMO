import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const S='/tmp/claude-0/-home-user-SURVIVALISMO/2b55304b-5655-5439-9b03-5833b97605d4/scratchpad/ux/';
for (const [k,w,h] of [['375',375,667],['320',320,568]]) {
const p = await (await b.newContext({viewport:{width:w,height:h}, isMobile:true, hasTouch:true, deviceScaleFactor:2})).newPage();
const errs=[]; p.on('pageerror', e=>errs.push(e.message));
await p.goto('http://localhost:8094/#/check/nivel2'); await p.waitForTimeout(500);
await p.locator('.chk-main').nth(0).click(); await p.locator('.chk-states [data-s="comprar"]').nth(1).click(); await p.waitForTimeout(200);
await p.locator('.chk-cad').nth(2).click(); await p.locator('.chk-fecha input').nth(2).fill('2026-10-10'); await p.locator('.chk-fecha input').nth(2).dispatchEvent('change'); await p.waitForTimeout(300);
await p.screenshot({path:S+`chk-${k}.png`});
console.log(k, 'pantallas', (await p.evaluate(()=>document.documentElement.scrollHeight/innerHeight)).toFixed(1), errs);
const peq = await p.$$eval('.chk-grupo[open] button, .chk-grupo summary', bs=>bs.filter(x=>x.getBoundingClientRect().height && x.getBoundingClientRect().height<44).length);
console.log('botones <44 visibles', peq);
}
await b.close();
