import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { cleanEnv, root } from '../scripts/lib.mjs';

const [kind, runDirectory] = process.argv.slice(2);
if (!['project', 'serena'].includes(kind) || !runDirectory) throw new Error('Usage: launch.mjs project|serena RUN_DIRECTORY');
const home = resolve(runDirectory, 'mcp-home', kind);
await mkdir(home, { recursive: true });
const child = spawn(process.execPath, [resolve(root, 'mcp', `${kind}.mjs`), resolve(runDirectory)], {
  stdio: 'inherit', windowsHide: true,
  env: cleanEnv({ HOME: home, USERPROFILE: home, SERENA_HOME: home }),
});
child.on('error', () => { console.error('MCP process failed to start.'); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal));
