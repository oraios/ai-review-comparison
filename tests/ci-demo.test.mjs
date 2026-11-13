import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { configuration, requiredSettings, inspectRepository, ensureImage } from '../scripts/ci-demo.mjs';
import { authorizeDispatch } from '../scripts/authorize-dispatch.mjs';
import { selectProviders } from '../scripts/providers.mjs';
import { setup } from '../scripts/setup-ci-secrets.mjs';
import { createDemoPull, awaitReviews } from '../scripts/demo-review-on-gh.mjs';

const repo = 'owner/repo';
const main = 'a'.repeat(40);
const head = 'b'.repeat(40);
const pricing = { sha: 'c'.repeat(40), content: Buffer.from('{\n  "freeShippingMinCents": 5000,\n  "shippingCents": 499\n}\n').toString('base64') };
const env = { GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/main', REVIEWER: 'claude',
  GITHUB_ACTOR: 'github-actions[bot]', GITHUB_TRIGGERING_ACTOR: 'github-actions[bot]', ROUTER_RUN_ID: '123' };
function authorizationRequest(overrides = {}) {
  return async path => {
    if (path.includes('/actions/runs/')) return { workflow_id: 7, event: 'pull_request_target', path: '.github/workflows/review-label.yml', repository: { full_name: repo }, actor: { login: 'maintainer' }, ...overrides.run };
    if (path.includes('/actions/workflows/')) return { id: 7 };
    if (path.includes('/pulls/')) return { labels: [{ name: 'review:claude' }], ...overrides.pr };
    return { permission: overrides.permission ?? 'write' };
  };
}

test('label delegation authorizes the human and rejects forged router IDs, removed labels, and readers', async () => {
  await authorizeDispatch({ repo, number: 1, env, request: authorizationRequest() });
  for (const overrides of [{ run: { workflow_id: 8 } }, { run: { event: 'push' } }, { pr: { labels: [] } }, { permission: 'read' }]) {
    await assert.rejects(authorizeDispatch({ repo, number: 1, env, request: authorizationRequest(overrides) }));
  }
  await assert.rejects(authorizeDispatch({ repo, number: 1, env: { ...env, ROUTER_RUN_ID: '' }, request: authorizationRequest() }));
});

test('manual dispatch and reruns both require maintainer access', async () => {
  const people = [];
  await assert.rejects(authorizeDispatch({ repo, number: 1, env: { ...env, GITHUB_ACTOR: 'maintainer', GITHUB_TRIGGERING_ACTOR: 'reader' }, request: async path => {
    people.push(path); return { permission: path.includes('/reader/') ? 'read' : 'write' };
  } }));
  assert.equal(people.length, 2);
});

test('dotenv parsing treats shell syntax as data and only selected settings are required', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'review-env-'));
  try {
    const file = join(dir, '.env');
    await writeFile(file, 'DEMO_REVIEWERS=copilot,github-aw\nGITHUB_REPOSITORY=owner/repo\nCOPILOT_GITHUB_TOKEN="synthetic-$(echo unsafe)"\n');
    const config = await configuration(['--env', file, '--dry-run'], {});
    assert.equal(config.env.COPILOT_GITHUB_TOKEN, 'synthetic-$(echo unsafe)');
    assert.deepEqual(requiredSettings(config), { secrets: ['COPILOT_GITHUB_TOKEN'], variables: [] });
    assert.throws(() => selectProviders('unknown'));
    assert.throws(() => requiredSettings({ selected: ['claude'], env: {} }), /CLAUDE_CODE_OAUTH_TOKEN/);
  } finally { await rm(dir, { recursive: true }); }
});

function fakeConfig() {
  const commands = [], calls = [];
  return { repo, selected: ['copilot', 'github-aw'], timeout: 100, env: { COPILOT_GITHUB_TOKEN: 'synthetic-secret' }, commands, calls,
    gh: (args, input) => { commands.push({ args, input }); return ''; },
    api: (path, body, method) => {
      calls.push({ path, body, method });
      if (path === '/user') return { type: 'User' };
      if (path === `/repos/${repo}`) return { default_branch: 'main', permissions: { admin: true, push: true } };
      if (path.includes('/git/ref/')) return { object: { sha: main } };
      if (path.includes('/contents/demo/')) return pricing;
      if (path.includes('/actions/permissions')) return { enabled: true };
      if (path.includes('/runs?')) return { workflow_runs: [{ id: 1, head_sha: main, status: 'completed', conclusion: 'success', html_url: 'https://example.test/image' }] };
      return {};
    } };
}

test('setup deduplicates shared auth and transmits secret values through stdin only', async () => {
  const config = fakeConfig();
  let saved;
  await setup(config, { save: async (path, value) => { saved = value; } });
  assert.ok(!JSON.stringify(saved).includes('synthetic-secret'));
  const secrets = config.commands.filter(command => command.args[0] === 'secret');
  assert.equal(secrets.length, 1);
  assert.equal(secrets[0].input, 'synthetic-secret');
  assert.ok(config.commands.every(command => !command.args.join(' ').includes('synthetic-secret')));
  assert.equal(config.commands.filter(command => command.args[0] === 'label').length, 5);
});

test('remote setup refuses a missing main workflow before creating any PR', () => {
  const config = fakeConfig();
  const api = config.api;
  config.api = (path, ...args) => { if (path.includes('review-label.yml')) throw new Error('404'); return api(path, ...args); };
  assert.throws(() => inspectRepository(config), /push this implementation to main/);
  assert.ok(config.calls.every(call => !call.body));
});

test('image build failure is surfaced before creating comparison PRs', async () => {
  let ticks = 0;
  const config = { repo, timeout: 100, gh: () => {}, api: path => path.includes('/runs?') ? { workflow_runs: [{ id: 8, head_sha: main, status: 'in_progress' }] } : { status: 'completed', conclusion: 'failure', html_url: 'https://example.test/failure' } };
  await assert.rejects(ensureImage(config, main, { now: () => ticks++, sleep: async () => {} }), /Image build failure/);
});

test('demo PR uses main, one small JSON diff, and no local git mutations', () => {
  const calls = [];
  const config = { repo, api: (path, body, method) => {
    calls.push({ path, body, method });
    return path.endsWith('/pulls') ? { number: 9, html_url: 'https://example.test/pr/9' } : { commit: { sha: head } };
  } };
  const pr = createDemoPull(config, 'opencode', { main, pricing }, 'unique');
  assert.equal(calls[0].body.sha, main);
  const changed = JSON.parse(Buffer.from(calls[1].body.content, 'base64').toString());
  assert.deepEqual(changed, { freeShippingMinCents: 500, shippingCents: 499 });
  assert.equal(calls[1].method, 'PUT');
  assert.equal(pr.label, 'review:opencode');
  assert.equal(pr.head, head);
});

test('review waiter requires a bot review of the exact PR head and provider', async () => {
  let count = 0, ticks = 0, saved = 0;
  const manifest = { pulls: [{ provider: 'claude', number: 9, head }] };
  const config = { repo, timeout: 100, api: () => [{ user: { login: 'github-actions[bot]' }, commit_id: ++count === 1 ? main : head,
    body: `<!-- ai-review-demo:claude:${head}:1:1 -->`, html_url: 'https://example.test/review' }] };
  await awaitReviews(config, manifest, async () => saved++, { now: () => ticks++, sleep: async () => {} });
  assert.equal(count, 2); assert.equal(saved, 1);
  assert.equal(manifest.pulls[0].review, 'https://example.test/review');
});
