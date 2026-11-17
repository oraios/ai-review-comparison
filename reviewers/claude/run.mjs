import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { cleanEnv, readJson } from '../../scripts/lib.mjs';

// Local counterpart to the Action: same model, prompt, MCP configuration and tools.
const directory = resolve(process.argv[2]);
if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) throw new Error('BLOCKED: AUTH_MISSING — CLAUDE_CODE_OAUTH_TOKEN');
const { model, effort } = await readJson(resolve(directory, 'environment.json'));
const home = resolve(directory, 'agent-home');
const prompt = await readFile(resolve(directory, 'prompt.txt'), 'utf8');
const child = spawn('claude', ['--print', '--model', model, '--effort', effort, '--max-turns', '12',
  '--permission-mode', 'default', '--tools', '', '--strict-mcp-config',
  '--mcp-config', resolve(directory, 'mcp.json'), '--setting-sources', '',
  '--allowedTools', 'mcp__project__review_context,mcp__project__run_checks,mcp__project__submit_review,mcp__serena__list_dir'], {
  cwd: home, stdio: ['pipe', 'ignore', 'inherit'], windowsHide: true,
  env: cleanEnv({ HOME: home, USERPROFILE: home, CLAUDE_CONFIG_DIR: resolve(home, '.claude'),
    CLAUDE_CODE_OAUTH_TOKEN: process.env.CLAUDE_CODE_OAUTH_TOKEN,
    CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1', DISABLE_AUTOUPDATER: '1' }),
});
const timeout = setTimeout(() => child.kill('SIGTERM'), 10 * 60_000);
child.on('error', error => { clearTimeout(timeout); console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { clearTimeout(timeout); process.exitCode = code ?? 1; });
child.stdin.on('error', () => {});
child.stdin.end(prompt);
