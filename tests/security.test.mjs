import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePricing, quote } from '../demo/pricing.mjs';
import { authorizeActor, validatePull, prNumber } from '../scripts/github.mjs';
import { cleanEnv } from '../scripts/lib.mjs';
import { checkFixture } from '../scripts/check-fixture.mjs';

test('business boundary passes at $50 and catches the intentional $5 regression', () => {
  assert.equal(checkFixture({ freeShippingMinCents: 5000, shippingCents: 499 }).status, 'passed');
  const broken = checkFixture({ freeShippingMinCents: 500, shippingCents: 499 });
  assert.equal(broken.status, 'failed');
  assert.deepEqual(broken.checks.filter(c => !c.pass).map(c => c.subtotalCents), [500, 4999]);
});
test('PR data cannot carry executable or prompt-bearing properties', () => {
  for (const input of [{ freeShippingMinCents: '500', shippingCents: 499 },
    { freeShippingMinCents: 500, shippingCents: 499, script: 'run me' },
    { freeShippingMinCents: -1, shippingCents: 499 }, JSON.parse('{"__proto__":{},"freeShippingMinCents":500,"shippingCents":499}')]) {
    assert.throws(() => validatePricing(input));
  }
  assert.throws(() => quote(NaN, { freeShippingMinCents: 5000, shippingCents: 499 }));
});
const pr = { state: 'open', changed_files: 1, head: { sha: 'a'.repeat(40), repo: { full_name: 'o/r' } }, base: { sha: 'b'.repeat(40), ref: 'main' } };
const files = [{ filename: 'demo/pricing.json', status: 'modified' }];
test('preflight rejects forks, executable changes, renames, closed PRs and non-maintainers', () => {
  validatePull(pr, 'o/r', files);
  assert.throws(() => validatePull({ ...pr, head: { ...pr.head, repo: { full_name: 'fork/r' } } }, 'o/r', files));
  assert.throws(() => validatePull({ ...pr, changed_files: 2 }, 'o/r', files));
  assert.throws(() => validatePull(pr, 'o/r', [{ filename: 'scripts/prepare-run.mjs', status: 'modified' }]));
  assert.throws(() => validatePull(pr, 'o/r', [{ ...files[0], status: 'renamed' }]));
  assert.throws(() => validatePull({ ...pr, state: 'closed' }, 'o/r', files));
  for (const value of ['read', 'triage', 'none', undefined]) assert.throws(() => authorizeActor(value));
  for (const value of ['write', 'maintain', 'admin']) authorizeActor(value);
  for (const value of ['1;echo x', '../1', '0', '-1', '1.5']) assert.throws(() => prNumber(value));
});
test('MCP subprocess environment does not inherit account or GitHub credentials', () => {
  process.env.UNEXPECTED_PROVIDER_SECRET = 'must-not-propagate';
  process.env.GITHUB_TOKEN = 'must-not-propagate';
  const env = cleanEnv();
  assert.equal(env.UNEXPECTED_PROVIDER_SECRET, undefined);
  assert.equal(env.GITHUB_TOKEN, undefined);
  delete process.env.UNEXPECTED_PROVIDER_SECRET;
  delete process.env.GITHUB_TOKEN;
});
