import { execFileSync, spawn } from 'node:child_process';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { resolve, join, isAbsolute } from 'node:path';
import { snapshotPull } from './pr-snapshot.mjs';
import { repository } from './github.mjs';
import { root, writeJson, imageMarker } from './lib.mjs';
import { localOptions, dockerRunArgs, credentialNames, localAgentEnv } from './local-options.mjs';

const help = `Run an existing fixture PR through a local review adapter (never publishes).

npm run review:local -- --reviewer copilot --pr 123 [--repo OWNER/REPO]
npm run review:local -- --reviewer claude --fixture regression --runtime native --prepare-only

--reviewer       claude | copilot | opencode | openhands
--pr             Existing open, same-repository numeric fixture PR
--repo           Defaults to gh repo view in this checkout (GitHub.com)
--fixture        healthy | regression: synthetic data (supply --image for offline Docker)
--runtime        docker (default) | native (Linux/macOS/WSL agent execution)
--image          Optional main GHCR digest/tag or locally built review image
--output         Parent for a fresh run directory (default artifacts/local-reviews)
--prepare-only   Prepare prompt and MCP configuration without inference
--serena         Native Serena executable (default .venv-serena)
--python         Native OpenHands Python executable (default .venv-openhands)

Credentials come from environment variables, not GitHub Actions secrets.
See docs/LOCAL_RUNS.md for setup and the differences from hosted execution.`;

function capture(command, args, options = {}) {
  try { return execFileSync(command, args, { cwd: root, encoding: 'utf8', timeout: 60_000,
    windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], ...options }).trim(); }
  catch { throw new Error(`${command} failed. Check installation, authentication and access; see docs/LOCAL_RUNS.md.`); }
}

async function main() {
  const options = localOptions(process.argv.slice(2));
  if (options.help) { console.log(help); return; }
  if (!options['prepare-only'] && !process.env[credentialNames[options.reviewer]]) {
    throw new Error(`AUTH_MISSING: set ${credentialNames[options.reviewer]} locally, or use --prepare-only.`);
  }
  const repo = options.repo || (options.pr
    ? repository(capture('gh', ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'])) : 'local/fixture');
  const checkoutRevision = capture('git', ['rev-parse', 'HEAD']);
  const checkoutDirty = Boolean(capture('git', ['status', '--porcelain']));
  const input = options.pr ? await snapshotPull({ repo, number: options.pr, workflowRevision: checkoutRevision,
    request: async path => JSON.parse(capture('gh', ['api', '--hostname', 'github.com', '--method', 'GET', path])) })
    : { repository: repo, number: 1, head: 'synthetic-fixture', base: 'synthetic-fixture', workflowRevision: checkoutRevision,
      path: 'demo/pricing.json', before: { freeShippingMinCents: 5000, shippingCents: 499 },
      after: { freeShippingMinCents: options.fixture === 'regression' ? 500 : 5000, shippingCents: 499 } };
  const parent = resolve(options.output);
  await mkdir(parent, { recursive: true });
  const directory = await mkdtemp(join(parent, `${options.reviewer}-`));
  console.log(`Local review directory: ${directory}`);
  const executable = value => value && (value.includes('/') || value.includes('\\')) && !isAbsolute(value) ? resolve(value) : value;
  const execution = { runtime: options.runtime, inputSource: options.pr ? 'GitHub PR snapshot' : `synthetic ${options.fixture}`,
    checkoutRevision, checkoutDirty, published: false,
    serena: executable(options.serena) || resolve(root, '.venv-serena', process.platform === 'win32' ? 'Scripts/serena.exe' : 'bin/serena'),
    python: executable(options.python) || resolve(root, '.venv-openhands', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python') };
  try {
    await writeJson(resolve(directory, 'seed.json'), input);
    let command; let args; let env;
    if (options.runtime === 'docker') {
      let image = options.image;
      if (!image) {
        const imageRepo = options.repo || (options.pr ? repo : repository(capture('gh',
          ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'])));
        image = `ghcr.io/${imageRepo.toLowerCase()}/review-env:main`;
      }
      // Refresh registry references; an explicit local build is taken from the local daemon.
      if (!options.image || image.startsWith('ghcr.io/')) capture('docker', ['pull', '--platform', 'linux/amd64', image], { timeout: 600_000 });
      const inspected = JSON.parse(capture('docker', ['image', 'inspect', image]))[0];
      if (inspected.Os !== 'linux' || inspected.Architecture !== 'amd64' || inspected.Config?.Labels?.['demo.marker'] !== imageMarker) {
        throw new Error('Select this project\'s Linux/amd64 review image (build it from the Dockerfile).');
      }
      execution.imageReference = image; execution.imageId = inspected.Id;
      execution.repoDigests = inspected.RepoDigests; execution.imageSourceRevision = inspected.Config.Labels['org.opencontainers.image.revision'];
      input.workflowRevision = execution.imageSourceRevision;
      await writeJson(resolve(directory, 'seed.json'), input);
      command = 'docker'; args = dockerRunArgs({ directory, imageId: inspected.Id, reviewer: options.reviewer, prepareOnly: options['prepare-only'] });
      // Docker needs the host's context/registry login; only named --env values enter the container.
      env = { ...process.env, LLM_MODEL: process.env.LLM_MODEL || process.env.OPENHANDS_MODEL || '' };
    } else {
      command = process.execPath; args = [resolve(root, 'scripts/local-worker.mjs'), options.reviewer, directory,
        ...(options['prepare-only'] ? ['--prepare-only'] : [])];
      env = localAgentEnv(options.reviewer);
    }
    await writeJson(resolve(directory, 'local-execution.json'), execution);
    const code = await new Promise((accept, reject) => {
      const child = spawn(command, args, { cwd: root, env, stdio: 'inherit', windowsHide: true });
      child.once('error', () => reject(new Error('Local runtime could not start. Check Docker/native prerequisites.')));
      child.once('exit', value => accept(value ?? 1));
    });
    process.exitCode = code;
  } catch (error) {
    await writeJson(resolve(directory, 'local-result.json'), { status: 'BLOCKED', published: false, hostedPass: false, reason: error.message });
    throw error;
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
