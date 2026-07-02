import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newContext({ locale: 'ar-EG' }).then(c => c.newPage());
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
page.on('response', (r) => { if (r.status() >= 400) errs.push(`${r.status()} ${r.url()}`); });
await page.goto('http://127.0.0.1:8123/index.html', { waitUntil: 'load' });
await page.waitForTimeout(1500);
const state = await page.evaluate(() => ({
  hasReact: !!window.React,
  hasKD: !!window.KineticData,
  hasRowMenu: typeof window.RowMenu,
  ME: window.ME ? { role: window.ME.role, name: window.ME.name } : null,
  h1: document.querySelector('h1, .h1')?.textContent || '',
  visibleButtons: Array.from(document.querySelectorAll('button')).slice(0, 30).map(b => b.textContent.trim()).filter(Boolean),
}));
console.log('STATE:', JSON.stringify(state, null, 2));
console.log('ERRORS:');
errs.forEach(e => console.log(' -', e));
await page.screenshot({ path: 'qa-probe.png', fullPage: true });
await browser.close();
