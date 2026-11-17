import { readFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import YAML from 'yaml';
import { root } from './lib.mjs';
import { resolve } from 'node:path';
import { providers } from './providers.mjs';

for (const file of await readdir(resolve(root, '.github/workflows'))) {
  if (!file.endsWith('.yml')) continue;
  const text = await readFile(resolve(root, '.github/workflows', file), 'utf8');
  const workflow = YAML.parse(text, { uniqueKeys: true });
  assert.ok(workflow.on && workflow.jobs, file);
  if (file === 'review-label.yml') {
    assert.deepEqual(workflow.on, { issue_comment: { types: ['created'] }, pull_request_target: { types: ['labeled'] } });
    assert.equal(workflow.permissions.actions, 'write');
    assert.equal(workflow.jobs.route.steps.length, 1);
    const script = workflow.jobs.route.steps[0].with.script;
    assert.ok(!text.includes('actions/checkout') && !text.includes('secrets.'));
    for (const provider of Object.values(providers)) assert.ok(script.includes(`'${provider.label}': '${provider.workflow}'`));
    assert.ok(!/review:(?:github-aw|openhands)/.test(script));
    assert.ok(script.includes('getCollaboratorPermissionLevel') && script.includes("ref: 'main'"));
  } else assert.ok(!text.includes('pull_request_target'), file);
  if (file.startsWith('review-') && file !== 'review-label.yml') {
    const provider = Object.values(providers).find(item => item.workflow === file);
    assert.ok(provider, `Unexpected reviewer workflow: ${file}`);
    assert.ok(!workflow.on.workflow_dispatch.inputs.model && !text.includes('_MODEL'));
    assert.deepEqual(Object.keys(workflow.on), ['workflow_dispatch']);
    assert.equal(workflow.jobs.review.container.image, '${{ needs.prepare.outputs.image }}');
    assert.equal(workflow.jobs.review.permissions['pull-requests'], 'read');
    assert.equal(workflow.jobs.publish.permissions['pull-requests'], 'write');
    assert.equal(workflow.jobs.prepare.if, "github.ref == 'refs/heads/main'");
    assert.equal(workflow.jobs.prepare.permissions.actions, 'read');
    assert.ok(workflow.on.workflow_dispatch.inputs.label_run_id);
    if (file === 'review-claude.yml') {
      const action = workflow.jobs.review.steps.find(step => step.uses?.startsWith('anthropics/claude-code-action@'));
      assert.equal(action.with.allowed_bots, 'github-actions', 'The label router dispatches as github-actions[bot].');
      assert.match(action.with.claude_args, /--model claude-sonnet-5-5 --effort medium\b/);
    }
    assert.ok(!JSON.stringify(workflow.jobs.publish).includes('secrets.'));
    assert.ok(!/anthropic_api_key|OPENAI_API_KEY|--yolo|--allow-all|self-hosted/.test(text));
  }
  for (const job of Object.values(workflow.jobs)) {
    assert.equal(job['runs-on'], 'ubuntu-latest');
    assert.ok(job['timeout-minutes'] > 0);
    for (const step of job.steps) if (step.uses) assert.match(step.uses, /@[a-f0-9]{40}$/);
  }
}
execFileSync(process.execPath, [resolve(root, 'scripts/generate-workflows.mjs'), '--check'], { stdio: 'inherit' });
console.log('Workflow YAML, label routing, dispatch gates, permissions and immutable action pins verified.');
