import { pathToFileURL } from 'node:url';
import { loadPricing, quote } from '../demo/pricing.mjs';

export function checkFixture(pricing) {
  const cases = [[0, 499], [499, 499], [500, 499], [4999, 499], [5000, 0], [5001, 0]];
  const checks = cases.map(([subtotalCents, expectedShippingCents]) => {
    const actual = quote(subtotalCents, pricing);
    return { subtotalCents, expectedShippingCents, actualShippingCents: actual.shippingCents,
      pass: actual.shippingCents === expectedShippingCents && actual.totalCents === subtotalCents + expectedShippingCents };
  });
  return { executed: true, status: checks.every(c => c.pass) ? 'passed' : 'failed', checks };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = checkFixture(await loadPricing(process.env.DEMO_PRICING));
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.status === 'passed' ? 0 : 1;
}
