import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { cleanEnv, readJson, writeJson } from '../../scripts/lib.mjs';

export function opencodeConfig(model, servers) {
  if (!/^opencode-go\/[a-zA-Z0-9._-]+$/.test(model || '')) throw new Error('Only the configured OpenCode Go subscription provider is allowed.');
  return {
    $schema: 'https://opencode.ai/config.json', model, small_model: model,
    enabled_providers: ['opencode-go'], share: 'disabled', autoupdate: false,
    provider: { 'opencode-go': { options: { apiKey: '{env:OPENCODE_GO_API_KEY}' } } },
    permission: { '*': 'deny', project_review_context: 'allow', project_run_checks: 'allow',
      project_submit_review: 'allow', serena_list_dir: 'allow' },
    mcp: Object.fromEntries(Object.entries(servers).map(([name, server]) => [name,
      { type: 'local', command: [server.command, ...server.args], enabled: true, timeout: 120000 }])),
  };
}

if (process.argv[1] === import.meta.filename) {
  const directory = resolve(process.argv[2]);
  if (!process.env.OPENCODE_GO_API_KEY) throw new Error('BLOCKED: AUTH_MISSING — OPENCODE_GO_API_KEY');
  const { model } = await readJson(resolve(directory, 'environment.json'));
  const { mcpServers } = await readJson(resolve(directory, 'mcp.json'));
  const home = resolve(directory, 'agent-home');
  await mkdir(home, { recursive: true });
  const configPath = resolve(home, 'opencode.json');
  await writeJson(configPath, opencodeConfig(model, mcpServers));
  const child = spawn('opencode', ['run', '--model', model, await readFile(resolve(directory, 'prompt.txt'), 'utf8')], {
    cwd: home, stdio: ['ignore', 'ignore', 'inherit'], windowsHide: true,
    env: cleanEnv({ HOME: home, XDG_CONFIG_HOME: resolve(home, '.config'), XDG_DATA_HOME: resolve(home, '.local/share'),
      XDG_CACHE_HOME: resolve(home, '.cache'), OPENCODE_CONFIG: configPath,
      OPENCODE_GO_API_KEY: process.env.OPENCODE_GO_API_KEY, OPENCODE_DISABLE_AUTOUPDATE: 'true' }),
  });
  const timeout = setTimeout(() => child.kill('SIGTERM'), 10 * 60_000);
  child.on('error', error => { clearTimeout(timeout); console.error(error.message); process.exitCode = 1; });
  child.on('exit', code => { clearTimeout(timeout); process.exitCode = code ?? 1; });
}
