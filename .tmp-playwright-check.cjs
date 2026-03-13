const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('CONSOLE', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGEERROR', err.stack || err.message));
  page.on('requestfailed', req => console.log('REQFAIL', req.url(), req.failure()?.errorText));
  await page.goto('https://vmrs.mrh.services/', { waitUntil: 'networkidle' });
  console.log('TITLE', await page.title());
  console.log('ROOT', await page.locator('#root').innerHTML());
  await browser.close();
})().catch(err => { console.error(err); process.exit(1); });
