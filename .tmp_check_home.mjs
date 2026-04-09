import { chromium } from '/dev-server/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1373, height: 723 } });
const errors = [];
page.on('pageerror', (err) => errors.push(`pageerror:${err.message}`));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console:${msg.text()}`);
});
await page.goto('http://127.0.0.1:8080/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
console.log('BROWSER_ERRORS_START');
console.log(JSON.stringify(errors, null, 2));
console.log('BROWSER_ERRORS_END');
console.log('PAGE_TITLE:' + await page.title());
console.log('PAGE_URL:' + page.url());
await browser.close();
