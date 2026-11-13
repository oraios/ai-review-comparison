// Shared CLI support: parse dotenv as data, use gh's login, and never pass secrets in argv.
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { parseEnv, parseArgs } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import { resolve } from 'node:path';
import { providers, selectProviders } from './providers.mjs';
import { repository } from './github.mjs';
import { validatePricing } from '../demo/pricing.mjs';

export async function configuration(argv = process.argv.slice(2), environment = process.env) {
  const { values } = parseArgs({ args: argv, options: {
    env: { type: 'string', default: '.env' }, repo: { type: 'string' }, reviewers: { type: 'string' },
    'dry-run': { type: 'boolean', default: false }, 'no-wait': { type: 'boolean', default: false },
    'timeout-minutes': { type: 'string', default: '45' },
  } });
  let file;
  try { file = parseEnv(await readFile(resolve(values.env), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; file = {}; }
  const env = { ...environment, ...Object.fromEntries(Object.entries(file).filter(([, v]) => v.trim())) };
  const selected = selectProviders(values.reviewers ?? env.DEMO_REVIEWERS);
  const timeout = Number(values['timeout-minutes']) * 60_000;
  if (!Number.isFinite(timeout) || timeout < 60_000 || timeout > 7_200_000) throw new Error('Timeout must be 1–120 minutes.');
  // Keep inference credentials out of child gh processes, including OS inheritance.
  const ghEnv = Object.fromEntries(Object.entries(environment).filter(([key]) =>
    ![...Object.values(providers).flatMap(p => p.secrets), 'GH_TOKEN', 'GITHUB_TOKEN'].includes(key)));
  if (env.GH_TOKEN) ghEnv.GH_TOKEN = env.GH_TOKEN;
  const gh = (args, input) => {
    try { return execFileSync('gh', args, { env: ghEnv, input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 120_000 }).trim(); }
    catch (error) { throw new Error(`gh ${args.slice(0, 2).join(' ')} failed (exit ${error.status ?? 'timeout'}). Check gh auth status and repository access.`); }
  };
  const api = (path, body, method = body === undefined ? 'GET' : 'POST') => {
    const result = gh(['api', path, '--method', method, ...(body === undefined ? [] : ['--input', '-'])],
      body === undefined ? undefined : JSON.stringify(body));
    return result ? JSON.parse(result) : null;
  };
  if (!values['dry-run']) {
    try { gh(['auth', 'status']); }
    catch {
      if (env.GH_TOKEN) throw new Error('GH_TOKEN could not authenticate. Fix it in .env or leave it empty to use gh auth login.');
      console.log('Authenticate the repository administrator with GitHub CLI.');
      execFileSync('gh', ['auth', 'login', '--hostname', 'github.com'], { env: ghEnv, stdio: 'inherit' });
    }
  }
  const repo = repository(values.repo ?? env.GITHUB_REPOSITORY ?? gh(['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner']));
  return { env, selected, timeout, gh, api, repo, dryRun: values['dry-run'], noWait: values['no-wait'] };
}

export function requiredSettings(config, { validate = true } = {}) {
  const secrets = [...new Set(config.selected.flatMap(name => providers[name].secrets))];
  const variables = [...new Set(config.selected.flatMap(name => providers[name].variables))];
  const missing = [...secrets, ...variables].filter(key => !config.env[key]?.trim());
  if (validate && missing.length) throw new Error(`Fill these .env entries for the selected reviewers: ${missing.join(', ')}`);
  if (validate && variables.includes('OPENCODE_MODEL') && !/^opencode-go\/[A-Za-z0-9._-]+$/.test(config.env.OPENCODE_MODEL)) {
    throw new Error('OPENCODE_MODEL must name an available opencode-go/MODEL_ID.');
  }
  return { secrets, variables };
}

export function inspectRepository({ api, repo, selected }, { admin = false } = {}) {
  const user = api('/user');
  if (user.type !== 'User') throw new Error('Run with a personal gh login; bot-created label events may not trigger Actions.');
  const info = api(`/repos/${repo}`);
  if (info.default_branch !== 'main') throw new Error('This demo requires main as the default branch.');
  if (admin ? !info.permissions?.admin : !info.permissions?.push) throw new Error(`Repository ${admin ? 'admin' : 'write'} access is required.`);
  const main = api(`/repos/${repo}/git/ref/heads/main`).object.sha;
  const files = ['build-image.yml', 'review-label.yml', ...selected.map(name => providers[name].workflow)];
  for (const file of files) {
    try { api(`/repos/${repo}/contents/.github/workflows/${file}?ref=${main}`); }
    catch { throw new Error(`Missing workflow ${file} on remote main. Commit and push this implementation to main first.`); }
  }
  const pricing = api(`/repos/${repo}/contents/demo/pricing.json?ref=${main}`);
  const before = validatePricing(JSON.parse(Buffer.from(pricing.content, 'base64').toString('utf8')));
  if (before.freeShippingMinCents !== 5000 || before.shippingCents !== 499) throw new Error('Remote main must contain the healthy $50/$4.99 fixture.');
  return { main, pricing, files };
}

export function establishLabels({ gh, repo }) {
  for (const [name, provider] of Object.entries(providers)) gh(['label', 'create', provider.label, '--repo', repo,
    '--color', provider.color, '--description', `Run ${name} review of the controlled fixture`, '--force']);
}

export async function ensureImage(config, main, { sleep = delay, now = Date.now } = {}) {
  const path = `/repos/${config.repo}/actions/workflows/build-image.yml/runs?branch=main&per_page=100`;
  let runs = config.api(path).workflow_runs;
  const ready = runs.find(run => run.head_sha === main && run.conclusion === 'success');
  if (ready) { console.log(`Image build already succeeded: ${ready.html_url}`); return ready; }
  let run = runs.find(item => item.head_sha === main && item.status !== 'completed');
  const started = now();
  if (!run) config.gh(['workflow', 'run', 'build-image.yml', '--repo', config.repo, '--ref', 'main']);
  let lastStatus;
  while (now() - started < config.timeout) {
    if (!run) run = config.api(path).workflow_runs.find(item => item.head_sha === main && Date.parse(item.created_at) >= started - 5000);
    else run = config.api(`/repos/${config.repo}/actions/runs/${run.id}`);
    if (run && run.status !== lastStatus) { console.log(`Image: ${run.status} — ${run.html_url}`); lastStatus = run.status; }
    if (run?.status === 'completed') {
      if (run.conclusion !== 'success') throw new Error(`Image build ${run.conclusion}: ${run.html_url}`);
      return run;
    }
    await sleep(10_000);
  }
  throw new Error('Timed out waiting for the main image. Check GitHub Actions and rerun setup.');
}
