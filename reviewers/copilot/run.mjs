import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { cleanEnv, readJson } from '../../scripts/lib.mjs';

const directory = resolve(process.argv[2]);
const { model } = await readJson(new URL('./config.json', import.meta.url));
if (!process.env.COPILOT_GITHUB_TOKEN) throw new Error('BLOCKED: AUTH_MISSING — COPILOT_GITHUB_TOKEN');
const child = spawn('copilot', [
  '-p', await readFile(resolve(directory, 'prompt.txt'), 'utf8'), '-s', '--model', model,
  '--no-auto-update', '--no-custom-instructions', '--disable-builtin-mcps', '--no-ask-user',
  '--additional-mcp-config', `@${resolve(directory, 'copilot-mcp.json')}`,
  '--allow-tool', 'project(review_context)', '--allow-tool', 'project(run_checks)',
  '--allow-tool', 'project(submit_review)', '--allow-tool', 'serena(list_dir)',
  '--deny-tool', 'shell', '--deny-tool', 'read', '--deny-tool', 'write', '--deny-tool', 'url', '--deny-tool', 'memory',
  '--excluded-tools', 'bash,powershell,list_bash,read_bash,write_bash,stop_bash,apply_patch,create,edit,view,task,skill,web_fetch,glob,grep',
  '--log-level', 'error',
], { cwd: resolve(directory, 'agent-home'), stdio: ['ignore', 'ignore', 'inherit'], windowsHide: true,
  env: cleanEnv({ HOME: resolve(directory, 'agent-home'), COPILOT_HOME: resolve(directory, 'agent-home/.copilot'),
    COPILOT_GITHUB_TOKEN: process.env.COPILOT_GITHUB_TOKEN, COPILOT_AUTO_UPDATE: 'false' }),
});
const timeout = setTimeout(() => child.kill('SIGTERM'), 10 * 60_000);
child.on('error', error => { clearTimeout(timeout); console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { clearTimeout(timeout); process.exitCode = code ?? 1; });
