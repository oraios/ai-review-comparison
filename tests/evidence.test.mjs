import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { validateSubmission, validateImage } from '../scripts/evidence.mjs';
import { changedReviewLines } from '../scripts/pr-snapshot.mjs';

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
test('a tag, local run, wrong architecture or malformed revision cannot qualify as evidence', () => {
  const environment = { image: `ghcr.io/o/r/review-env@sha256:${'a'.repeat(64)}`, marker: 'REVIEW_IMAGE_OK_2026',
    revision: 'b'.repeat(40), platform: 'linux', arch: 'x64' };
  validateImage(environment);
  for (const changed of [{ image: 'ghcr.io/o/r:main' }, { marker: 'LOCAL_ONLY' }, { arch: 'arm64' }, { revision: 'main' }]) {
    assert.throws(() => validateImage({ ...environment, ...changed }));
  }
});

test('review locations follow hunk offsets, count context and ignore no-newline markers', () => {
  const patch = ['@@ -7,3 +9,2 @@', ' context', '-"shippingCents": 499,', '-removed text', '+"shippingCents": 300,',
    '\\ No newline at end of file', '@@ -18,0 +20 @@', '+added text'].join('\n');
  assert.deepEqual(changedReviewLines(patch), [
    { line: 8, side: 'LEFT', fields: ['shippingCents'] }, { line: 9, side: 'LEFT', fields: [] },
    { line: 10, side: 'RIGHT', fields: ['shippingCents'] }, { line: 20, side: 'RIGHT', fields: [] },
  ]);
  assert.deepEqual(changedReviewLines(undefined), []);
});

test('findings can only select a line and side offered by the context tool', () => {
  const { events, review } = fixture();
  const location = { line: 7, side: 'LEFT' };
  events[0].result.changedLines = [location];
  assert.throws(() => validateSubmission(review, events), /changedLines/);
  review.findings[0].location = { ...location, side: 'RIGHT' };
  assert.throws(() => validateSubmission(review, events), /changedLines/);
  review.findings[0].location = location;
  validateSubmission(review, events);
});
