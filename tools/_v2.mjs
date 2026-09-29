import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const S='/tmp/claude-0/-home-user-SURVIVALISMO/2b55304b-5655-5439-9b03-5833b97605d4/scratchpad/ux/';
const p = await (await b.newContext({viewport:{width:320,height:568}, isMobile:true, hasTouch:true, deviceScaleFactor:2})).newPage();
for (const r of ['/mapa','/sec/juegos/calma','/sec/familia','/buscar?q=agua','/emergencia']) { await p.goto('http://localhost:8094/#'+r); await p.waitForTimeout(800); await p.screenshot({path:S+'b58'+r.replace(/[\/?=]/g,'_')+'.png'}); }
await b.close();
