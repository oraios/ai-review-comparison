// Create comparable PRs using GitHub APIs, label them with the human gh login, and await reviews.
import { setTimeout as delay } from 'node:timers/promises';
import { randomBytes } from 'node:crypto';
import { configuration, inspectRepository, establishLabels, ensureImage } from './ci-demo.mjs';
import { providers } from './providers.mjs';
import { writeJson } from './lib.mjs';

export function createDemoPull(config, provider, { main, pricing }, suffix) {
  const branch = `codex/demo-${suffix}-${provider}`;
  const before = Buffer.from(pricing.content, 'base64').toString('utf8');
  const after = before.replace(/("freeShippingMinCents"\s*:\s*)5000\b/, (_, prefix) => `${prefix}500`);
  if (after === before) throw new Error('Expected healthy fixture before creating the regression.');
  config.api(`/repos/${config.repo}/git/refs`, { ref: `refs/heads/${branch}`, sha: main });
  const changed = config.api(`/repos/${config.repo}/contents/demo/pricing.json`, {
    branch, sha: pricing.sha, message: `Demo ${provider}: lower free-shipping threshold`, content: Buffer.from(after).toString('base64'),
  }, 'PUT');
  const pr = config.api(`/repos/${config.repo}/pulls`, {
    head: branch, base: 'main', title: `Review demo / ${provider}: shipping regression`,
    body: `Controlled comparison for **${provider}**. Only the pricing threshold changes from 5000 to 500 cents. The requirement remains free shipping at $50, with $4.99 shipping below it. Applying \`${providers[provider].label}\` starts the review.`,
  });
  return { provider, branch, number: pr.number, url: pr.html_url, head: changed.commit.sha, label: providers[provider].label };
}

export async function awaitReviews(config, manifest, save, { sleep = delay, now = Date.now } = {}) {
  const started = now();
  while (now() - started < config.timeout) {
    for (const pr of manifest.pulls.filter(item => !item.review)) {
      const reviews = config.api(`/repos/${config.repo}/pulls/${pr.number}/reviews?per_page=100`);
      const review = reviews.find(item => item.user?.login === 'github-actions[bot]' && item.commit_id === pr.head &&
        item.body?.startsWith(`<!-- ai-review-demo:${pr.provider}:${pr.head}:`));
      if (review) { pr.review = review.html_url; console.log(`${pr.provider}: ${pr.review}`); await save(); }
    }
    if (manifest.pulls.every(pr => pr.review)) return;
    console.log(`Waiting for: ${manifest.pulls.filter(pr => !pr.review).map(pr => pr.provider).join(', ')}. Actions: https://github.com/${config.repo}/actions`);
    await sleep(15_000);
  }
  throw new Error('Timed out waiting for PR reviews. Check Actions for auth, model access, image, or evidence failures. Existing PR URLs are saved in the manifest; rerun their labels after fixing the cause.');
}

export async function demo(config) {
  if (config.dryRun) {
    console.log(JSON.stringify({ repository: config.repo, reviewers: config.selected,
      changes: { file: 'demo/pricing.json', freeShippingMinCents: [5000, 500] }, labels: config.selected.map(name => providers[name].label), mutations: false }, null, 2));
    return;
  }
  const snapshot = inspectRepository(config);
  const secretNames = new Set(JSON.parse(config.gh(['secret', 'list', '--repo', config.repo, '--json', 'name'])).map(s => s.name));
  const missing = config.selected.flatMap(name => providers[name].secrets.filter(key => !secretNames.has(key)));
  if (missing.length) throw new Error(`Run setup-ci-secrets first. Missing settings: ${[...new Set(missing)].join(', ')}`);
  await ensureImage(config, snapshot.main);
  establishLabels(config);
  const suffix = `${new Date().toISOString().replace(/[-:.TZ]/g, '')}-${randomBytes(3).toString('hex')}`;
  const manifest = { repository: config.repo, main: snapshot.main, createdAt: new Date().toISOString(), pulls: [] };
  const file = `artifacts/github-demo-${suffix}.json`;
  const save = () => writeJson(file, manifest);
  await save();
  console.log(`Manifest: ${file}`);
  for (const provider of config.selected) {
    const pr = createDemoPull(config, provider, snapshot, suffix);
    manifest.pulls.push(pr); await save();
    console.log(`${provider}: ${pr.url}`);
    config.api(`/repos/${config.repo}/issues/${pr.number}/labels`, { labels: [pr.label] });
    pr.labeled = true; await save();
  }
  if (!config.noWait) await awaitReviews(config, manifest, save);
  console.log(config.noWait ? 'PRs labeled. Follow their Actions runs and review tabs.' : 'All selected PRs have a published review.');
}

if (process.argv[1] === import.meta.filename) {
  try { await demo(await configuration()); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
