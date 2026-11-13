import { readFile } from 'node:fs/promises';

export function validatePricing(value) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype ||
      Object.keys(value).sort().join(',') !== 'freeShippingMinCents,shippingCents') {
    throw new Error('Pricing must contain exactly freeShippingMinCents and shippingCents.');
  }
  for (const amount of Object.values(value)) {
    if (!Number.isSafeInteger(amount) || amount < 0 || amount > 100_000) {
      throw new Error('Pricing values must be integer cents between 0 and 100000.');
    }
  }
  return value;
}

export async function loadPricing(path = new URL('./pricing.json', import.meta.url)) {
  const text = await readFile(path, 'utf8');
  if (text.length > 1024) throw new Error('Pricing file exceeds 1 KiB.');
  return validatePricing(JSON.parse(text));
}

export function quote(subtotalCents, pricing) {
  validatePricing(pricing);
  if (!Number.isSafeInteger(subtotalCents) || subtotalCents < 0 || subtotalCents > 1_000_000) {
    throw new Error('Subtotal must be integer cents between 0 and 1000000.');
  }
  const shippingCents = subtotalCents >= pricing.freeShippingMinCents ? 0 : pricing.shippingCents;
  return { subtotalCents, shippingCents, totalCents: subtotalCents + shippingCents };
}
