import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import YAML from 'yaml';
import { root } from './lib.mjs';
import { resolve } from 'node:path';
import { providers } from './providers.mjs';

const image = 'ghcr.io/oraios/ai-review-comparison/review-env:main';
const files = (await readdir(resolve(root, '.github/workflows'))).filter(file => file.endsWith('.yml'));
for (const { workflow } of Object.values(providers)) assert.ok(files.includes(workflow), `Missing ${workflow}`);

for (const file of files) {
  const text = await readFile(resolve(root, '.github/workflows', file), 'utf8');
  const workflow = YAML.parse(text, { uniqueKeys: true });
  assert.ok(workflow.on && workflow.jobs, file);
  assert.ok(!text.includes('pull_request_target'), file);
  assert.ok(!/anthropic_api_key|OPENAI_API_KEY|--yolo|self-hosted/.test(text), file);
  for (const job of Object.values(workflow.jobs)) {
    assert.equal(job['runs-on'], 'ubuntu-latest');
    assert.ok(job['timeout-minutes'] > 0);
    for (const step of job.steps) if (step.uses) assert.match(step.uses, /@[a-f0-9]{40}$/);
  }
  const provider = Object.entries(providers).find(([, item]) => item.workflow === file);
  if (file.startsWith('review-')) assert.ok(provider, `Unexpected reviewer workflow: ${file}`);
  if (!provider) continue;

  // Each reviewer listens to GitHub events itself and runs its agent in the project image.
  const [name, { label }] = provider;
  const jobs = Object.values(workflow.jobs);
  assert.equal(jobs.length, 1, `${file} runs one job`);
  const [agent] = jobs;
  assert.equal(agent.container.image, image);
  assert.ok(agent.steps.some(step => step.run?.includes('safe.directory')), 'Git in the job container must trust the checkout.');
  assert.equal(agent.permissions.contents, 'read', 'Reviewers answer and comment; they do not push.');
  assert.equal(agent.permissions['pull-requests'], 'write');
  assert.ok(workflow.on.issue_comment && workflow.on.pull_request_review_comment && workflow.on.pull_request_review, file);
  assert.ok(!workflow.on.workflow_dispatch, file);
  assert.equal(Boolean(workflow.on.pull_request), Boolean(label), `${file}: only labelled reviewers listen to pull_request`);
  if (label) assert.ok(agent.if.includes(`github.event.label.name == '${label}'`));
  // Strangers' comments must not start a runner; the in-job checks then require write access.
  assert.ok(agent.if.includes(`fromJSON('["OWNER","MEMBER","COLLABORATOR"]'), github.event.comment.author_association`), `${file}: author association gate`);
  const settings = JSON.parse(await readFile(resolve(root, 'reviewers', name, 'config.json'), 'utf8'));
  if (name === 'claude') {
    const action = agent.steps.find(step => step.uses?.startsWith('anthropics/claude-code-action@'));
    assert.ok(!action.with.prompt, 'Without a prompt the action reads the /claude comment.');
    assert.ok(agent.if.includes("'/claude'") && !agent.if.includes('@claude') && action.with.trigger_phrase === '/claude');
    assert.ok(workflow.on.pull_request_review);
    assert.ok(action.with.claude_args.includes(`--model ${settings.model} --effort ${settings.effort} `));
  } else if (name === 'copilot') {
    assert.ok(agent.if.includes("'/copilot'") && workflow.on.pull_request_review);
    assert.ok(text.includes('/permission') && /admin\|maintain\|write/.test(text), 'Comment command needs a write-access gate.');
    assert.ok(text.includes(`--model ${settings.model} --reasoning-effort ${settings.effort} `));
  } else if (name === 'opencode') {
    // opencode github run checks write access and reacts itself.
    assert.ok(agent.if.includes("'/oc'") && agent.if.includes("'/opencode'"));
    assert.ok(text.includes('run: opencode github run') && text.includes("USE_GITHUB_TOKEN: 'true'"));
    // The native agent rejects pull_request_review; that path checks write access itself.
    assert.ok(text.includes('opencode run --model') && text.includes('/permission'));
    assert.ok(text.includes(`MODEL: ${settings.model}`) && text.includes('edit: "deny"'));
  }
}
console.log('Workflow YAML, reviewer triggers, permissions, image and immutable action pins verified.');
