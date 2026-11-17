import { execFileSync, spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { prepareRun } from './prepare-run.mjs';
import { readJson, readAudit, writeJson, root, cleanEnv } from './lib.mjs';
import { validateSubmission } from './evidence.mjs';
import { credentialNames, localAgentEnv, localReviewers } from './local-options.mjs';

export async function localResult(directory, agentSucceeded) {
  const environment = await readJson(resolve(directory, 'environment.json'));
  if (environment.run !== 'local' || environment.marker !== 'LOCAL_ONLY') throw new Error('Expected a local run.');
  if (!agentSucceeded) throw new Error('The agent process did not finish successfully.');
  const review = validateSubmission(await readJson(resolve(directory, 'review.json')), await readAudit(directory));
  return { status: 'LOCAL_REVIEW_VERIFIED', published: false, hostedPass: false,
    input: await readJson(resolve(directory, 'input.json')), environment, review };
}

function execute(command, args, env, cwd) {
  return new Promise((accept, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'inherit', 'inherit'], windowsHide: true });
    const timer = setTimeout(() => child.kill('SIGTERM'), 12 * 60_000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => { clearTimeout(timer); accept(code === 0); });
  });
}

export async function runLocalWorker(reviewer, directory, prepareOnly = false) {
  if (!localReviewers.includes(reviewer)) throw new Error('Unsupported local reviewer.');
  const execution = await readJson(resolve(directory, 'local-execution.json'));
  let result;
  try {
    if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
      process.env.PLAYWRIGHT_BROWSERS_PATH = process.platform === 'win32'
        ? resolve(process.env.LOCALAPPDATA || resolve(homedir(), 'AppData/Local'), 'ms-playwright')
        : resolve(homedir(), process.platform === 'darwin' ? 'Library/Caches/ms-playwright' : '.cache/ms-playwright');
    }
    if (execution.runtime === 'docker') execution.baked = await readJson(resolve(root, 'image/provenance.json'));
    const environment = await prepareRun({ reviewer, directory, inputPath: resolve(directory, 'seed.json'),
      local: true, image: execution.imageId || 'local-no-image', localExecution: execution,
      serenaCommand: execution.runtime === 'docker' ? '/opt/serena-venv/bin/serena' : execution.serena });
    if (prepareOnly) {
      result = { status: 'LOCAL_PREPARED', published: false, hostedPass: false,
        note: 'Prompt and MCP configuration only; no inference or tool execution.' };
    } else {
      if (process.platform === 'win32') throw new Error('Native agent execution requires Linux/macOS/WSL. Use Docker on Windows; native --prepare-only remains available.');
      const env = localAgentEnv(reviewer);
      if (!env[credentialNames[reviewer]]) throw new Error(`AUTH_MISSING: set ${credentialNames[reviewer]} in this shell.`);
      environment.versions = { ...environment.versions, agentRuntime: execFileSync(reviewer, ['--version'],
        { env: cleanEnv(), encoding: 'utf8', timeout: 30_000, stdio: ['ignore', 'pipe', 'pipe'] }).trim() };
      await writeJson(resolve(directory, 'environment.json'), environment);
      const adapter = resolve(root, 'reviewers', reviewer, 'run.mjs');
      const succeeded = await execute(process.execPath, [adapter, directory], env, root);
      result = await localResult(directory, succeeded);
      const report = [`# Local review: ${reviewer}`, `Repository: ${result.input.repository} · PR: ${result.input.number}`,
        `Input source: ${execution.inputSource} · Commit: ${result.input.head}`, `Model: ${environment.model}`,
        `Runtime: ${execution.runtime} · Status: ${result.status} · Published: false`, result.review.summary,
        ...result.review.findings.map(f => `## [${f.severity}] ${f.title}\n\n${f.path}\n\n${f.body}`)].join('\n\n');
      await writeFile(resolve(directory, 'report.md'), report + '\n');
    }
  } catch (error) {
    // Avoid persisting child stderr or command arguments, which might contain account details.
    result = { status: 'BLOCKED', published: false, hostedPass: false,
      reason: error.code ? `Local process failed (${error.code}). Check installed tools and their versions.` : error.message };
  }
  await writeJson(resolve(directory, 'local-result.json'), result);
  console.log(`${result.status}: ${result.reason || result.note || 'Real MCP receipts and checks verified; report.md written.'}`);
  return result.status !== 'BLOCKED';
}

if (process.argv[1] === import.meta.filename) {
  const [reviewer, directory, flag] = process.argv.slice(2);
  if (!directory) throw new Error('Expected REVIEWER RUN_DIRECTORY [--prepare-only].');
  process.exitCode = await runLocalWorker(reviewer, resolve(directory), flag === '--prepare-only') ? 0 : 1;
}
