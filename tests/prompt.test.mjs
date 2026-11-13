import test from 'node:test';
import assert from 'node:assert/strict';
import { assemblePrompt } from '../scripts/review-prompt.mjs';
import { opencodeConfig } from '../reviewers/opencode/run.mjs';

test('review prompt includes trusted policy, reviewer override and immutable PR context', async () => {
  const input = { repository: 'owner/repo', number: 42, head: 'a'.repeat(40), base: 'b'.repeat(40), workflowRevision: 'c'.repeat(40) };
  const prompt = await assemblePrompt('opencode', input);
  assert.match(prompt.text, /\$50\.00/);
  assert.match(prompt.text, /one concise finding/);
  assert.match(prompt.text, /"pullRequest": 42/);
  assert.ok(prompt.text.includes(input.head));
  assert.notEqual(prompt.sha256, (await assemblePrompt('opencode', { ...input, head: 'd'.repeat(40) })).sha256);
  await assert.rejects(assemblePrompt('../escape', input));
});

test('OpenCode confines providers, sharing and tool permissions', () => {
  assert.throws(() => opencodeConfig('anthropic/something', {}));
  const config = opencodeConfig('opencode-go/example', { project: { command: 'node', args: ['server.mjs'] } });
  assert.deepEqual(config.enabled_providers, ['opencode-go']);
  assert.equal(config.small_model, config.model);
  assert.equal(config.share, 'disabled');
  assert.equal(config.permission['*'], 'deny');
  assert.equal(config.permission.project_run_checks, 'allow');
  assert.deepEqual(config.mcp.project.command, ['node', 'server.mjs']);
});
