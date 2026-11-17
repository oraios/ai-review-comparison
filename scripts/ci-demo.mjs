// Shared CLI support: parse dotenv as data, use gh's login, and never pass secrets in argv.
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { parseEnv, parseArgs } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import { resolve } from 'node:path';
import { providers, labelled, selectProviders } from './providers.mjs';
import { repository } from './github.mjs';
import { authenticateGitHub, githubCli, githubCliEnvironment } from './github-cli.mjs';
import { validatePricing } from '../demo/pricing.mjs';

export async function configuration(argv = process.argv.slice(2), environment = process.env, { validateSettings = false } = {}) {
  const { values } = parseArgs({ args: argv, options: {
    env: { type: 'string', default: '.env' }, repo: { type: 'string' }, reviewers: { type: 'string' },
    'dry-run': { type: 'boolean', default: false }, 'no-wait': { type: 'boolean', default: false },
    'timeout-minutes': { type: 'string', default: '90' },
  } });
  let file;
  try { file = parseEnv(await readFile(resolve(values.env), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; file = {}; }
  const env = { ...environment, ...Object.fromEntries(Object.entries(file).filter(([, v]) => v.trim())) };
  const configured = env.DEMO_REVIEWERS?.split(',').map(name => name.trim());
  const retired = configured?.filter(name => ['openhands', 'github-aw'].includes(name)) ?? [];
  if (values.reviewers === undefined && retired.length) console.warn(`Ignoring retired reviewers in .env: ${retired.join(', ')}.`);
  const selected = selectProviders(values.reviewers ?? configured?.filter(name => !retired.includes(name)).join(','));
  if (validateSettings && !values['dry-run']) requiredSettings({ env, selected });
  const timeout = Number(values['timeout-minutes']) * 60_000;
  if (!Number.isFinite(timeout) || timeout < 60_000 || timeout > 7_200_000) throw new Error('Timeout must be 1–120 minutes.');
  // Keep inference credentials out of child gh processes, including OS inheritance.
  const ghEnv = githubCliEnvironment(environment);
  let repo = values.repo ?? env.GITHUB_REPOSITORY;
  if (!repo) {
    try {
      const origin = execFileSync('git', ['remote', 'get-url', 'origin'], { env: ghEnv, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      const githubOrigin = origin.match(/^(?:https:\/\/github\.com\/|ssh:\/\/git@github\.com\/|git@github\.com:)([^/]+\/[^/]+)\/?$/i);
      repo = githubOrigin?.[1].replace(/\.git$/, '');
    } catch { /* gh can also resolve a checkout with a nonstandard remote. */ }
  }
  const executable = values['dry-run'] && repo ? 'gh' : await githubCli(ghEnv);
  if (env.GH_TOKEN) ghEnv.GH_TOKEN = env.GH_TOKEN;
  const gh = (args, input) => {
    try { return execFileSync(executable, args, { env: ghEnv, input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 120_000 }).trim(); }
    catch (error) {
      const status = /\bHTTP (\d{3})\b/.exec(error.stderr ?? '')?.[1];
      throw new Error(`gh ${args.slice(0, 2).join(' ')} failed (${status ? 'HTTP ' + status : error.code ?? 'exit ' + error.status}). Check GitHub authentication and repository permissions.`);
    }
  };
  const api = (path, body, method = body === undefined ? 'GET' : 'POST') => {
    const result = gh(['api', path, '--method', method, ...(body === undefined ? [] : ['--input', '-'])],
      body === undefined ? undefined : JSON.stringify(body));
    return result ? JSON.parse(result) : null;
  };
  if (!values['dry-run']) authenticateGitHub(executable, ghEnv);
  repo = repository(repo ?? gh(['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner']));
  return { env, selected, timeout, gh, api, repo, dryRun: values['dry-run'], noWait: values['no-wait'] };
}

export function requiredSettings(config, { validate = true } = {}) {
  const secrets = [...new Set(config.selected.flatMap(name => providers[name].secrets))];
  const missing = secrets.filter(key => !config.env[key]?.trim());
  if (validate && missing.length) throw new Error(`Fill these .env entries for the selected reviewers: ${missing.join(', ')}`);
  return { secrets, missing };
}

export function inspectRepository({ api, repo, selected }, { admin = false } = {}) {
  const user = api('/user');
  if (user.type !== 'User') throw new Error('Run with a personal gh login; bot-created label events may not trigger Actions.');
  const info = api(`/repos/${repo}`);
  if (info.default_branch !== 'main') throw new Error('This demo requires main as the default branch.');
  if (admin ? !info.permissions?.admin : !info.permissions?.push) throw new Error(`Repository ${admin ? 'admin' : 'write'} access is required.`);
  const main = api(`/repos/${repo}/git/ref/heads/main`).object.sha;
  const router = selected.some(name => providers[name].label) ? ['review-label.yml'] : [];
  const files = ['build-image.yml', ...router, ...selected.map(name => providers[name].workflow)];
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
  for (const [name, provider] of Object.entries(labelled)) gh(['label', 'create', provider.label, '--repo', repo,
    '--color', provider.color, '--description', `Run ${name} review of the controlled fixture`, '--force']);
}

export async function ensureImage(config, main, { sleep = delay, now = Date.now } = {}) {
  const path = `/repos/${config.repo}/actions/workflows/build-image.yml/runs?branch=main&head_sha=${main}&per_page=30`;
  const runs = config.api(path).workflow_runs;
  const ready = runs.find(run => run.head_sha === main && run.conclusion === 'success');
  if (ready) { console.log(`Image build already succeeded: ${ready.html_url}`); return ready; }
  let run = runs.find(item => item.head_sha === main && item.status !== 'completed');
  const previousIds = new Set(runs.map(item => item.id));
  const started = now();
  if (!run) config.gh(['workflow', 'run', 'build-image.yml', '--repo', config.repo, '--ref', 'main']);
  let lastStatus;
  while (now() - started < config.timeout) {
    if (!run) run = config.api(path).workflow_runs.find(item => item.head_sha === main && !previousIds.has(item.id));
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
