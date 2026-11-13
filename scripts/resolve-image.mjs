import { execFileSync } from 'node:child_process';
import { appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { repository } from './github.mjs';
import { writeJson, imageMarker } from './lib.mjs';

const repo = repository(process.env.GITHUB_REPOSITORY).toLowerCase();
const tag = `ghcr.io/${repo}/review-env:main`;
const run = args => execFileSync('docker', args, { encoding: 'utf8', timeout: 600_000, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const manifest = JSON.parse(run(['buildx', 'imagetools', 'inspect', tag, '--format', '{{json .Manifest}}']));
assert.match(manifest.digest, /^sha256:[a-f0-9]{64}$/);
const image = `ghcr.io/${repo}/review-env@${manifest.digest}`;
run(['pull', '--platform', 'linux/amd64', image]);
const inspected = JSON.parse(run(['image', 'inspect', image]))[0];
const labels = inspected.Config.Labels;
assert.equal(labels['org.opencontainers.image.revision'], process.env.GITHUB_SHA,
  'The main image is stale. Wait for Publish review image to finish, then dispatch again from main.');
assert.equal(labels['org.opencontainers.image.source']?.toLowerCase(), `https://github.com/${repo}`);
assert.equal(labels['demo.branch'], 'main');
assert.equal(labels['demo.marker'], imageMarker);
assert.equal(inspected.Os, 'linux');
assert.equal(inspected.Architecture, 'amd64');
await writeJson(resolve('artifacts/input/resolved-image.json'), {
  image, configDigest: inspected.Id, revision: process.env.GITHUB_SHA, tag, labels,
});
await appendFile(process.env.GITHUB_OUTPUT, `image=${image}\n`);
await appendFile(process.env.GITHUB_STEP_SUMMARY, `\nReview image resolved from main: \`${image}\`\n`);
