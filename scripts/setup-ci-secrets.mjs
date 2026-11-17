// Configure repository prerequisites, then wait for the trusted main image before creating PRs.
import { configuration, requiredSettings, inspectRepository, establishLabels, ensureImage } from './ci-demo.mjs';
import { labelled } from './providers.mjs';
import { writeJson } from './lib.mjs';

export async function setup(config, { save = writeJson } = {}) {
  const { secrets, missing } = requiredSettings(config, { validate: !config.dryRun });
  if (config.dryRun) {
    console.log(JSON.stringify({ repository: config.repo, reviewers: config.selected, secretNames: secrets,
      variableNames: ['DEMO_REVIEWERS'], missingSettings: missing,
      labels: Object.values(labelled).map(p => p.label), image: 'main', mutations: false }, null, 2));
    return;
  }
  const { main, files } = inspectRepository(config, { admin: true });
  const permissions = config.api(`/repos/${config.repo}/actions/permissions`);
  if (!permissions.enabled) config.api(`/repos/${config.repo}/actions/permissions`, { enabled: true }, 'PUT');
  // Preserve existing allowed-action and approval policies; organization restrictions still apply.
  for (const file of files) config.gh(['workflow', 'enable', file, '--repo', config.repo]);
  establishLabels(config);
  for (const key of secrets) {
    config.gh(['secret', 'set', key, '--repo', config.repo, '--app', 'actions'], config.env[key]);
    console.log(`Configured secret ${key}`);
  }
  config.gh(['variable', 'set', 'DEMO_REVIEWERS', '--repo', config.repo], config.selected.join(','));
  const imageRun = await ensureImage(config, main);
  await save('artifacts/ci-setup.json', { repository: config.repo, main, reviewers: config.selected,
    imageRun: imageRun.html_url, configuredAt: new Date().toISOString() });
  console.log('Ready. Run npm run demo-review-on-gh with the same .env.');
}

if (process.argv[1] === import.meta.filename) {
  try { await setup(await configuration(process.argv.slice(2), process.env, { validateSettings: true })); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
