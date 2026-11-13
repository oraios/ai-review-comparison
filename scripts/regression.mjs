import { writeFile } from 'node:fs/promises';
// Run on the demo PR branch. Only this numeric JSON file changes.
await writeFile(new URL('../demo/pricing.json', import.meta.url), JSON.stringify({ freeShippingMinCents: 500, shippingCents: 499 }, null, 2) + '\n');
console.log('Introduced the demo regression: free shipping starts at $5 instead of $50.');
