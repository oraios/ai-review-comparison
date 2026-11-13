import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { startServer } from '../demo/server.mjs';
import { loadPricing } from '../demo/pricing.mjs';

export async function smoke(pricing, screenshot) {
  const { server, url } = await startServer(pricing);
  let browser;
  try {
    // Use the full bundled Chromium's headless mode (also present in the pinned image).
    browser = await chromium.launch({ channel: 'chromium', headless: true });
    const context = await browser.newContext({ viewport: { width: 1100, height: 820 }, serviceWorkers: 'block' });
    await context.route('**/*', route => new URL(route.request().url()).origin === url ? route.continue() : route.abort());
    const page = await context.newPage();
    await page.goto(url);
    await page.getByLabel('Order subtotal ($)').fill('49.99');
    await page.getByRole('button', { name: 'Calculate' }).click();
    await page.waitForFunction(() => document.querySelector('output').textContent.startsWith('Shipping:'));
    const actual = await page.locator('output').textContent();
    if (screenshot) { await mkdir(dirname(screenshot), { recursive: true }); await page.screenshot({ path: screenshot }); }
    const expected = 'Shipping: $4.99 · Total: $54.98';
    return { executed: true, status: actual === expected ? 'passed' : 'failed', expected, actual, browser: browser.version() };
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await smoke(await loadPricing(process.env.DEMO_PRICING), resolve('artifacts/smoke.png'));
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.status === 'passed' ? 0 : 1;
}
