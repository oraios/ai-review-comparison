import { execFileSync } from 'node:child_process';
import { readJson, writeJson, imageMarker, root } from '../scripts/lib.mjs';
import { resolve } from 'node:path';
const version = command => execFileSync(command, ['--version'], { encoding: 'utf8' }).trim();
const packages = await readJson(resolve(root, 'image/agents/package.json'));
await writeJson(resolve(root, 'image/provenance.json'), {
  marker: imageMarker, revision: process.env.IMAGE_REVISION,
  source: process.env.IMAGE_SOURCE,
  versions: { ...packages.dependencies, node: process.version, serena: '6e5c3776d4e67befaab7c290bc29b0279c98d1ed',
    openhands: '1.62.0', playwright: '1.65.0', claudeRuntime: version('claude'), copilotRuntime: version('copilot'), opencodeRuntime: version('opencode') },
});
