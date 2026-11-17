import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir, userInfo } from 'node:os';
import { join } from 'node:path';
import { configuration, requiredSettings, inspectRepository, ensureImage } from '../scripts/ci-demo.mjs';
import { authenticateGitHub, githubCliEnvironment } from '../scripts/github-cli.mjs';
import { authorizeDispatch } from '../scripts/authorize-dispatch.mjs';
import { selectProviders } from '../scripts/providers.mjs';
import { setup } from '../scripts/setup-ci-secrets.mjs';
import { createDemoPull, awaitReviews } from '../scripts/demo-review-on-gh.mjs';

const repo = 'owner/repo';
const main = 'a'.repeat(40);
const head = 'b'.repeat(40);
const pricing = { sha: 'c'.repeat(40), content: Buffer.from('{\n  "freeShippingMinCents": 5000,\n  "shippingCents": 499\n}\n').toString('base64') };
const env = { GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/main', REVIEWER: 'opencode',
  GITHUB_ACTOR: 'github-actions[bot]', GITHUB_TRIGGERING_ACTOR: 'github-actions[bot]', ROUTER_RUN_ID: '123' };
function authorizationRequest(overrides = {}) {
  return async path => {
    if (path.includes('/actions/runs/')) return { workflow_id: 7, event: 'pull_request_target', path: '.github/workflows/review-label.yml', repository: { full_name: repo }, actor: { login: 'maintainer' }, ...overrides.run };
    if (path.includes('/actions/workflows/')) return { id: 7 };
    if (path.includes('/pulls/')) return { labels: [{ name: 'review:opencode' }], ...overrides.pr };
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

test('a follow-up must be an unedited maintainer command on this PR for this reviewer', async () => {
  const comment = { user: { login: 'maintainer', type: 'User' }, issue_url: `https://api.github.com/repos/${repo}/issues/1`,
    body: '/review opencode Explain the new evidence.', created_at: 't1', updated_at: 't1' };
  const check = (changes = {}) => authorizeDispatch({ repo, number: 1, env: { ...env, COMMENT_ID: '12' },
    request: path => path.includes('/issues/comments/') ? { ...comment, ...changes } :
      authorizationRequest({ run: { event: 'issue_comment' } })(path) });
  assert.deepEqual(await check(), { author: 'maintainer', commentId: '12', question: 'Explain the new evidence.' });
  for (const changes of [{ updated_at: 't2' }, { user: { login: 'other' } }, { body: '/review claude Hello' },
    { issue_url: `https://api.github.com/repos/${repo}/issues/2` }]) await assert.rejects(check(changes));
});

test('only single-container subscription reviewers are selectable', () => {
  assert.deepEqual(selectProviders(), ['claude', 'copilot', 'opencode']);
  assert.throws(() => selectProviders('github-aw'));
  assert.throws(() => selectProviders('openhands'));
});

test('dotenv parsing treats shell syntax as data and only selected settings are required', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'review-env-'));
  try {
    const file = join(dir, '.env');
    await writeFile(file, 'DEMO_REVIEWERS=copilot,openhands,github-aw\nGITHUB_REPOSITORY=owner/repo\nCOPILOT_GITHUB_TOKEN="synthetic-$(echo unsafe)"\n');
    const config = await configuration(['--env', file, '--dry-run'], {});
    assert.equal(config.env.COPILOT_GITHUB_TOKEN, 'synthetic-$(echo unsafe)');
    assert.deepEqual(config.selected, ['copilot']);
    assert.throws(() => selectProviders('openhands'));
    assert.throws(() => selectProviders('github-aw'));
    assert.deepEqual(requiredSettings(config), { secrets: ['COPILOT_GITHUB_TOKEN'], missing: [] });
    assert.throws(() => selectProviders('unknown'));
    assert.throws(() => requiredSettings({ selected: ['claude'], env: {} }), /CLAUDE_CODE_OAUTH_TOKEN/);
  } finally { await rm(dir, { recursive: true }); }
});

test('the GitHub CLI child keeps the shell credential settings across supported platforms', () => {
  const shell = { HOME: '/shell-home', GH_CONFIG_DIR: 'custom-gh', XDG_CONFIG_HOME: 'custom-xdg',
    SSH_AUTH_SOCK: 'agent-socket', DBUS_SESSION_BUS_ADDRESS: 'session-bus',
    CLAUDE_CODE_OAUTH_TOKEN: 'private', COPILOT_GITHUB_TOKEN: 'private', OPENCODE_GO_API_KEY: 'private' };
  for (const platform of ['linux', 'darwin', 'win32']) {
    const env = githubCliEnvironment(shell, platform);
    for (const key of ['HOME', 'GH_CONFIG_DIR', 'XDG_CONFIG_HOME', 'SSH_AUTH_SOCK', 'DBUS_SESSION_BUS_ADDRESS']) {
      assert.equal(env[key], shell[key]);
    }
    assert.ok(!Object.values(env).includes('private'));
  }
});

test('missing HOME on Linux or macOS uses the OS account home', () => {
  for (const platform of ['linux', 'darwin']) {
    const env = githubCliEnvironment({}, platform);
    assert.equal(env.HOME, userInfo().homedir);
    assert.equal(env.USERPROFILE, undefined);
    assert.equal(env.APPDATA, undefined);
  }
});

test('Windows gh recovers the native profile and preserves redirected or explicit configuration', () => {
  const env = githubCliEnvironment({ HOME: '/custom/home', AppData: 'Z:\\roaming' }, 'win32');
  assert.equal(env.USERPROFILE, userInfo().homedir);
  assert.equal(env.APPDATA, 'Z:\\roaming');
  const explicit = githubCliEnvironment({ UserProfile: 'Z:\\profile', Gh_Config_Dir: 'Z:\\gh' }, 'win32');
  assert.equal(explicit.USERPROFILE, 'Z:\\profile');
  assert.equal(explicit.GH_CONFIG_DIR, 'Z:\\gh');
  assert.equal(explicit.APPDATA, undefined);
});

test('GitHub login is only requested when authentication is required', () => {
  const calls = [];
  const check = (failure, env = {}) => authenticateGitHub('gh', env, (_, args) => {
    calls.push(args);
    if (args[0] === 'api' && failure) throw failure;
  });
  check();
  assert.deepEqual(calls, [['api', '--hostname', 'github.com', 'user', '--silent']]);
  assert.throws(() => check({ status: 1, stderr: 'HTTP 503' }), /HTTP 503/);
  assert.throws(() => check({ status: 1, stderr: 'HTTP 403' }), /HTTP 403/);
  assert.throws(() => check({ status: 1, stderr: 'HTTP 401' }, { GH_TOKEN: 'test' }), /GH_TOKEN/);
  assert.ok(calls.every(args => args[0] === 'api'));
  check({ status: 4 });
  assert.deepEqual(calls.at(-1), ['auth', 'login', '--hostname', 'github.com']);
});

function fakeConfig() {
  const commands = [], calls = [];
  return { repo, selected: ['copilot'], timeout: 100, env: { COPILOT_GITHUB_TOKEN: 'synthetic-secret', COPILOT_MODEL: 'test-model' }, commands, calls,
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

test('setup configures the selected subscription credential through stdin only', async () => {
  const config = fakeConfig();
  let saved;
  await setup(config, { save: async (path, value) => { saved = value; } });
  assert.ok(!JSON.stringify(saved).includes('synthetic-secret'));
  const secrets = config.commands.filter(command => command.args[0] === 'secret');
  assert.equal(secrets.length, 1);
  assert.equal(secrets[0].input, 'synthetic-secret');
  assert.ok(config.commands.every(command => !command.args.join(' ').includes('synthetic-secret')));
  assert.deepEqual(config.commands.filter(command => command.args[0] === 'label').map(command => command.args[2]), ['review:opencode']);
  assert.deepEqual(config.commands.filter(command => command.args[0] === 'variable').map(command => command.args[2]), ['DEMO_REVIEWERS']);
});

test('remote setup refuses a missing main workflow before creating any PR', () => {
  const config = fakeConfig();
  const api = config.api;
  config.api = (path, ...args) => { if (path.includes('review-copilot.yml')) throw new Error('404'); return api(path, ...args); };
  assert.throws(() => inspectRepository(config), /push this implementation to main/);
  assert.ok(config.calls.every(call => !call.body));
});

test('image build failure is surfaced before creating comparison PRs', async () => {
  let ticks = 0;
  const config = { repo, timeout: 100, gh: () => {}, api: path => path.includes('/runs?') ? { workflow_runs: [{ id: 8, head_sha: main, status: 'in_progress' }] } : { status: 'completed', conclusion: 'failure', html_url: 'https://example.test/failure' } };
  await assert.rejects(ensureImage(config, main, { now: () => ticks++, sleep: async () => {} }), /Image build failure/);
});

test('setup waits for the newly dispatched image when a previous attempt just failed', async () => {
  const failed = { id: 8, head_sha: main, status: 'completed', conclusion: 'failure', created_at: new Date().toISOString() };
  const queued = { id: 9, head_sha: main, status: 'queued', html_url: 'https://example.test/build/9' };
  let polls = 0, dispatched = 0;
  let time = Date.parse(failed.created_at);
  const config = {
    repo, timeout: 100, gh: () => { dispatched++; },
    api: path => {
      if (path.endsWith('/runs/9')) return { ...queued, status: 'completed', conclusion: 'success' };
      return { workflow_runs: ++polls > 2 ? [queued, failed] : [failed] };
    },
  };
  const build = await ensureImage(config, main, { sleep: async () => {}, now: () => time++ });
  assert.equal(build.id, 9);
  assert.equal(dispatched, 1);
});

test('a [skip-image-build] push reuses the last image published from main', async () => {
  const skipped = { id: 3, head_sha: main, status: 'completed', conclusion: 'skipped' };
  const previous = { id: 2, head_sha: head, status: 'completed', conclusion: 'success', html_url: 'https://example.test/build/2' };
  let dispatched = 0;
  const config = { repo, timeout: 100, gh: () => { dispatched++; },
    api: path => ({ workflow_runs: path.includes('status=success') ? [previous] : [skipped] }) };
  assert.equal((await ensureImage(config, main, { sleep: async () => {}, now: () => 0 })).id, 2);
  assert.equal(dispatched, 0);
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

test('comment-triggered reviewers are requested by comment, not label', () => {
  const config = { repo, api: path => path.endsWith('/pulls') ? { number: 9, html_url: 'https://example.test/pr/9' } : { commit: { sha: head } } };
  assert.deepEqual(Object.keys(createDemoPull(config, 'claude', { main, pricing }, 'u')).filter(key => ['label', 'command'].includes(key)), ['command']);
  assert.equal(createDemoPull(config, 'claude', { main, pricing }, 'u').command, '@claude Review this PR.');
  assert.equal(createDemoPull(config, 'copilot', { main, pricing }, 'u').command, '/copilot Review this PR.');
});

test('review waiter follows the agent workflow run and ignores skipped runs', async () => {
  let polls = 0, ticks = 0;
  const manifest = { pulls: [{ provider: 'claude', number: 9, head, url: 'https://example.test/pr/9', command: '@claude Review this PR.', requestedAt: '2026-11-17T00:00:00Z' }] };
  const skipped = { status: 'completed', conclusion: 'skipped', html_url: 'https://example.test/skipped' };
  const done = { status: 'completed', conclusion: 'success', html_url: 'https://example.test/run' };
  const config = { repo, timeout: 100, api: path => {
    assert.ok(path.includes("review-claude.yml/runs?event=issue_comment&created=%3E%3D2026-11-17T00:00:00Z"), path);
    return { workflow_runs: ++polls === 1 ? [skipped] : [skipped, done] };
  } };
  await awaitReviews(config, manifest, async () => {}, { now: () => ticks++, sleep: async () => {} });
  assert.equal(manifest.pulls[0].run, 'https://example.test/run');
  const failed = { pulls: [{ ...manifest.pulls[0], review: undefined }] };
  await assert.rejects(awaitReviews({ repo, timeout: 100, api: () => ({ workflow_runs: [{ ...done, conclusion: 'failure' }] }) }, failed, async () => {},
    { now: () => ticks++, sleep: async () => {} }), /claude review failure/);
});
