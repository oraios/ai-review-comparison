import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { repository, prNumber } from './github.mjs';
import { cleanEnv } from './lib.mjs';

export const localReviewers = ['claude', 'copilot', 'opencode', 'openhands'];
export const credentialNames = { claude: 'CLAUDE_CODE_OAUTH_TOKEN', copilot: 'COPILOT_GITHUB_TOKEN',
  opencode: 'OPENCODE_GO_API_KEY', openhands: 'LLM_API_KEY' };

export function localOptions(args) {
  const { values } = parseArgs({ args, strict: true, options: {
    reviewer: { type: 'string' }, pr: { type: 'string' }, repo: { type: 'string' },
    runtime: { type: 'string', default: 'docker' }, image: { type: 'string' }, fixture: { type: 'string' },
    output: { type: 'string', default: 'artifacts/local-reviews' }, serena: { type: 'string' },
    python: { type: 'string' }, 'prepare-only': { type: 'boolean', default: false }, help: { type: 'boolean' },
  } });
  if (values.help) return values;
  if (!localReviewers.includes(values.reviewer)) throw new Error(`Choose --reviewer ${localReviewers.join('|')}.`);
  if (!['docker', 'native'].includes(values.runtime)) throw new Error('Choose --runtime docker|native.');
  if (Boolean(values.pr) === Boolean(values.fixture)) throw new Error('Specify exactly one of --pr NUMBER or --fixture healthy|regression.');
  if (values.pr) values.pr = prNumber(values.pr);
  if (values.repo) values.repo = repository(values.repo);
  if (values.fixture && !['healthy', 'regression'].includes(values.fixture)) throw new Error('Invalid fixture.');
  if (values.runtime === 'native' && values.image) throw new Error('--image requires --runtime docker.');
  if (values.runtime === 'docker' && (values.serena || values.python)) throw new Error('Docker supplies Serena and Python; these overrides require --runtime native.');
  if (values.image && (values.image.startsWith('-') || !/^[A-Za-z0-9][A-Za-z0-9._/:@-]+$/.test(values.image))) throw new Error('Invalid Docker image reference.');
  return values;
}

// The provider process gets one selected credential, never the caller's gh login.
export function localAgentEnv(reviewer, source = process.env) {
  const env = cleanEnv();
  env.PLAYWRIGHT_BROWSERS_PATH ||= process.platform === 'win32'
    ? resolve(source.LOCALAPPDATA || resolve(homedir(), 'AppData/Local'), 'ms-playwright')
    : resolve(homedir(), process.platform === 'darwin' ? 'Library/Caches/ms-playwright' : '.cache/ms-playwright');
  for (const name of [credentialNames[reviewer], 'OPENCODE_MODEL', 'LLM_MODEL']) {
    if (source[name]) env[name] = source[name];
  }
  if (!env.LLM_MODEL && source.OPENHANDS_MODEL) env.LLM_MODEL = source.OPENHANDS_MODEL;
  return env;
}

export function dockerRunArgs({ directory, imageId, reviewer, prepareOnly = false }) {
  const path = resolve(directory);
  if (path.includes(',')) throw new Error('Docker bind paths containing commas are unsupported; choose --output elsewhere.');
  return ['run', '--rm', '--init', '--platform', 'linux/amd64',
    '--mount', `type=bind,source=${path},target=/tmp/review-run`,
    '--env', credentialNames[reviewer], '--env', 'OPENCODE_MODEL', '--env', 'LLM_MODEL',
    imageId, 'node', '/opt/review-demo/scripts/local-worker.mjs', reviewer, '/tmp/review-run',
    ...(prepareOnly ? ['--prepare-only'] : [])];
}
