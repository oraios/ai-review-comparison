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
    assert.deepEqual(workflow.on, { pull_request_target: { types: ['labeled'] } });
    assert.equal(workflow.permissions.actions, 'write');
    assert.equal(workflow.jobs.route.steps.length, 1);
    const script = workflow.jobs.route.steps[0].with.script;
    assert.ok(!text.includes('actions/checkout') && !text.includes('secrets.'));
    for (const provider of Object.values(providers)) assert.ok(script.includes(`'${provider.label}': '${provider.workflow}'`));
    assert.ok(script.includes('getCollaboratorPermissionLevel') && script.includes("ref: 'main'"));
  } else assert.ok(!text.includes('pull_request_target'), file);
  if (file.startsWith('review-') && file !== 'review-label.yml') {
    assert.deepEqual(Object.keys(workflow.on), ['workflow_dispatch']);
    assert.equal(workflow.jobs.review.container.image, '${{ needs.prepare.outputs.image }}');
    assert.equal(workflow.jobs.review.permissions['pull-requests'], 'read');
    assert.equal(workflow.jobs.publish.permissions['pull-requests'], 'write');
    assert.equal(workflow.jobs.prepare.if, "github.ref == 'refs/heads/main'");
    assert.equal(workflow.jobs.prepare.permissions.actions, 'read');
    assert.ok(workflow.on.workflow_dispatch.inputs.label_run_id);
    assert.ok(!JSON.stringify(workflow.jobs.publish).includes('secrets.'));
    assert.ok(!/anthropic_api_key|OPENAI_API_KEY|--yolo|--allow-all|self-hosted/.test(text));
  }
  const agentic = file === 'aw-codex.lock.yml';
  if (agentic) {
    assert.deepEqual(Object.keys(workflow.on), ['workflow_dispatch']);
    assert.match(workflow.jobs.agent.if, /github.ref == 'refs\/heads\/main'/);
    assert.equal(workflow.jobs.agent.permissions['pull-requests'], 'read');
    assert.equal(workflow.jobs.publish.permissions['pull-requests'], 'write');
    assert.ok(workflow.jobs.publish.needs.includes('detection'));
    assert.ok(!JSON.stringify(workflow.jobs.publish).includes('secrets.'));
    assert.ok(!text.includes('secrets.OPENAI_API_KEY'));
    assert.ok(text.includes('secrets.COPILOT_GITHUB_TOKEN'));
    assert.ok(text.includes('finalize-comparator.mjs'));
    assert.ok(text.includes('--pull'));
    const source = await readFile(resolve(root, '.github/workflows/aw-codex.md'), 'utf8');
    const frontmatter = YAML.parse(source.split('---')[1]);
    assert.equal(frontmatter['safe-outputs']['create-issue'], false);
    assert.equal(frontmatter['safe-outputs']['report-failure-as-issue'], false);
    assert.equal(frontmatter['safe-outputs']['report-incomplete']['create-issue'], false);
    assert.equal(frontmatter.tools.bash, false);
    assert.equal(frontmatter.tools['cli-proxy'], false);
    for (const server of Object.values(frontmatter['mcp-servers'])) {
      assert.equal(server.container, 'ghcr.io/oraios/ai-review-comparison/review-env:main');
      assert.deepEqual(server.args.slice(0, 4), ['--pull', 'never', '--network', 'none']);
      assert.ok(server.args.includes('/tmp/review-demo-aw:/tmp/review-demo-aw'));
    }
  }
  for (const job of Object.values(workflow.jobs)) {
    assert.ok((agentic ? ['ubuntu-latest', 'ubuntu-slim'] : ['ubuntu-latest']).includes(job['runs-on']));
    if (!agentic || job['timeout-minutes'] !== undefined) assert.ok(job['timeout-minutes'] > 0);
    for (const step of job.steps) if (step.uses) assert.match(step.uses, /@[a-f0-9]{40}$/);
  }
}
execFileSync(process.execPath, [resolve(root, 'scripts/generate-workflows.mjs'), '--check'], { stdio: 'inherit' });
console.log('Workflow YAML, label routing, dispatch gates, permissions and immutable action pins verified.');
