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
    for (const provider of Object.values(providers)) {
      assert.equal(script.includes(`': '${provider.workflow}'`), Boolean(provider.label), `Router entry for ${provider.workflow}`);
      if (provider.label) assert.ok(script.includes(`'${provider.label}': '${provider.workflow}'`));
    }
    assert.ok(!/review:(?:github-aw|openhands)/.test(script));
    assert.ok(script.includes('getCollaboratorPermissionLevel') && script.includes("ref: 'main'"));
  } else assert.ok(!text.includes('pull_request_target'), file);
  const provider = Object.entries(providers).find(([, item]) => item.workflow === file);
  if (file.startsWith('review-') && file !== 'review-label.yml') assert.ok(provider, `Unexpected reviewer workflow: ${file}`);
  assert.ok(!/anthropic_api_key|OPENAI_API_KEY|--yolo|self-hosted/.test(text), file);
  if (provider?.[1].label) {
    // Router-dispatched pipeline: fixture snapshot, read-only review job, separate publish job.
    assert.ok(!workflow.on.workflow_dispatch.inputs.model && !text.includes('_MODEL'));
    assert.deepEqual(Object.keys(workflow.on), ['workflow_dispatch']);
    assert.equal(workflow.jobs.review.container.image, '${{ needs.prepare.outputs.image }}');
    assert.equal(workflow.jobs.review.permissions['pull-requests'], 'read');
    assert.equal(workflow.jobs.publish.permissions['pull-requests'], 'write');
    assert.equal(workflow.jobs.prepare.if, "github.ref == 'refs/heads/main'");
    assert.equal(workflow.jobs.prepare.permissions.actions, 'read');
    assert.ok(workflow.on.workflow_dispatch.inputs.label_run_id);
    assert.ok(!JSON.stringify(workflow.jobs.publish).includes('secrets.'));
    assert.ok(!text.includes('--allow-all'), file);
  } else if (provider) {
    // Comment-triggered agent: runs in the project image and posts its own comments.
    const [name] = provider;
    const settings = JSON.parse(await readFile(resolve(root, 'reviewers', name, 'config.json'), 'utf8'));
    assert.ok(workflow.on.issue_comment && workflow.on.pull_request_review_comment, file);
    assert.ok(!workflow.on.pull_request && !workflow.on.workflow_dispatch, file);
    const [agent] = Object.values(workflow.jobs).filter(job => job.container);
    assert.equal(agent.container.image, 'ghcr.io/oraios/ai-review-comparison/review-env:main');
    assert.ok(agent.steps.some(step => step.run?.includes('safe.directory')), 'Git in the job container must trust the checkout.');
    assert.equal(agent.permissions.contents, 'read', 'Reviewers answer and comment; they do not push.');
    assert.equal(agent.permissions['pull-requests'], 'write');
    const trigger = agent.if ?? '';
    if (name === 'claude') {
      const action = agent.steps.find(step => step.uses?.startsWith('anthropics/claude-code-action@'));
      assert.ok(!action.with.prompt, 'Without a prompt the action reads the @claude comment.');
      assert.ok(trigger.includes("'@claude'"));
      assert.ok(action.with.claude_args.includes(`--model ${settings.model} --effort ${settings.effort} `));
    } else {
      assert.ok(trigger.includes(`'/${name}'`) && text.includes('/permission') && /admin|maintain|write/.test(text), 'Comment command needs a write-access gate.');
      assert.ok(text.includes(`--model ${settings.model} --reasoning-effort ${settings.effort} `));
    }
  }
  for (const job of Object.values(workflow.jobs)) {
    assert.equal(job['runs-on'], 'ubuntu-latest');
    assert.ok(job['timeout-minutes'] > 0);
    for (const step of job.steps) if (step.uses) assert.match(step.uses, /@[a-f0-9]{40}$/);
  }
}
execFileSync(process.execPath, [resolve(root, 'scripts/generate-workflows.mjs'), '--check'], { stdio: 'inherit' });
console.log('Workflow YAML, comment and label triggers, dispatch gates, permissions and immutable action pins verified.');
