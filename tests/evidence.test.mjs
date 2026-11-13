import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { validateSubmission, validateImage } from '../scripts/evidence.mjs';
import { publishResult } from '../scripts/publish.mjs';

function fixture() {
  const events = [
    { tool: 'project.review_context', receipt: randomUUID(), result: { marker: 'MCP_DEMO_OK_2026' } },
    { tool: 'serena.list_dir', receipt: randomUUID(), result: { upstream: { content: ['pricing.json'] } } },
    { tool: 'project.run_checks', receipt: randomUUID(), result: { unit: { executed: true, status: 'failed' }, browser: { executed: true, status: 'failed' } } },
  ];
  const review = { summary: 'The observed change incorrectly grants free shipping before the documented threshold.',
    findings: [{ title: 'Incorrect shipping threshold', body: 'The test at 4999 cents returned zero shipping although 499 cents is required.', path: 'demo/pricing.json', severity: 'P2' }],
    contextReceipt: events[0].receipt, serenaReceipt: events[1].receipt, checksReceipt: events[2].receipt,
    observedMarker: 'MCP_DEMO_OK_2026', observedUnitStatus: 'failed', observedBrowserStatus: 'failed' };
  return { events, review };
}
test('a configured MCP server or echoed static marker is insufficient', () => {
  const { events, review } = fixture();
  validateSubmission(review, events);
  assert.throws(() => validateSubmission(review, []));
  assert.throws(() => validateSubmission({ ...review, serenaReceipt: randomUUID() }, events));
  assert.throws(() => validateSubmission({ ...review, checksReceipt: randomUUID() }, events));
  assert.throws(() => validateSubmission({ ...review, observedBrowserStatus: 'passed' }, events));
  assert.throws(() => validateSubmission({ ...review, findings: [] }, events));
  events[2].result.browser.executed = false;
  assert.throws(() => validateSubmission(review, events));
});
test('a tag, local run, wrong architecture or stale image cannot qualify as evidence', () => {
  const environment = { image: `ghcr.io/o/r/review-env@sha256:${'a'.repeat(64)}`, marker: 'REVIEW_IMAGE_OK_2026',
    revision: 'b'.repeat(40), platform: 'linux', arch: 'x64' };
  validateImage(environment, 'b'.repeat(40));
  for (const changed of [{ image: 'ghcr.io/o/r:main' }, { marker: 'LOCAL_ONLY' }, { arch: 'arm64' }, { revision: 'c'.repeat(40) }]) {
    assert.throws(() => validateImage({ ...environment, ...changed }, 'b'.repeat(40)));
  }
});

test('each publication mode requires real evidence and a GitHub receipt, with the correct image claim', async () => {
  for (const reviewer of ['claude', 'copilot', 'opencode', 'openhands', 'github-aw']) {
    const comparator = reviewer === 'github-aw';
    const { events, review } = fixture();
    const head = 'c'.repeat(40), revision = 'b'.repeat(40);
    const result = { status: comparator ? 'COMPARATOR_EVIDENCE_VERIFIED' : 'READY_TO_PUBLISH',
      input: { repository: 'o/r', number: 1, head }, review, evidence: { published: false },
      environment: { reviewer, run: '2', attempt: '1', model: 'test', auth: 'test', versions: {},
        imageRole: comparator ? 'mcp-tools' : 'agent-and-mcp-tools',
        image: `ghcr.io/o/r/review-env@sha256:${'a'.repeat(64)}`, marker: 'REVIEW_IMAGE_OK_2026', revision, platform: 'linux', arch: 'x64' } };
    const env = { REVIEWER: reviewer, GITHUB_REPOSITORY: 'o/r', PR_NUMBER: '1', GITHUB_RUN_ID: '2', GITHUB_RUN_ATTEMPT: '1', GITHUB_SHA: revision };
    let posts = 0;
    const request = async (path, options) => {
      if (path.includes('/files?')) return [{ filename: 'demo/pricing.json', status: 'modified' }];
      if (options) {
        posts++;
        const body = JSON.parse(options.body);
        assert.equal(body.commit_id, head); assert.equal(body.event, 'COMMENT');
        assert.ok(body.body.includes(comparator ? 'MCP tools image (agent runs in github-aw managed sandbox)' : 'Agent and MCP image'));
        return { id: 42, html_url: 'https://example.test/review' };
      }
      return { state: 'open', changed_files: 1, head: { sha: head, repo: { full_name: 'o/r' } }, base: { ref: 'main', sha: revision } };
    };
    await assert.rejects(publishResult(structuredClone(result), { env, request, audit: [] }));
    assert.equal(posts, 0);
    await publishResult(result, { env, request, audit: events });
    assert.equal(posts, 1);
    assert.equal(result.status, comparator ? 'COMPARATOR_REVIEW_PUBLISHED' : 'PASS');
    assert.equal(result.publication.id, 42);
  }
});
