import assert from 'node:assert/strict';
import { z } from 'zod';
import { marker, imageMarker } from './lib.mjs';

export const submissionShape = {
  summary: z.string().min(40).max(3000),
  findings: z.array(z.object({ title: z.string().min(10).max(160),
    body: z.string().min(40).max(2500), path: z.literal('demo/pricing.json'),
    severity: z.enum(['P1', 'P2', 'P3']) }).strict()).max(5),
  contextReceipt: z.string().uuid(), serenaReceipt: z.string().uuid(), checksReceipt: z.string().uuid(),
  observedMarker: z.literal(marker),
  observedUnitStatus: z.enum(['passed', 'failed']), observedBrowserStatus: z.enum(['passed', 'failed']),
};
export function validateSubmission(value, events) {
  const review = z.object(submissionShape).strict().parse(value);
  const lookup = (tool, receipt) => {
    const event = events.find(e => e.tool === tool && e.receipt === receipt);
    assert.ok(event, `Missing actual ${tool} call or incorrect receipt.`);
    return event.result;
  };
  const context = lookup('project.review_context', review.contextReceipt);
  assert.equal(context.marker, review.observedMarker);
  const serena = lookup('serena.list_dir', review.serenaReceipt);
  assert.ok(JSON.stringify(serena.upstream).includes('pricing.json'));
  const checks = lookup('project.run_checks', review.checksReceipt);
  assert.equal(checks.unit.executed, true);
  assert.equal(checks.browser.executed, true);
  assert.equal(checks.unit.status, review.observedUnitStatus);
  assert.equal(checks.browser.status, review.observedBrowserStatus);
  if (checks.unit.status === 'failed' || checks.browser.status === 'failed') {
    assert.ok(review.findings.length > 0, 'A reproduced regression requires a finding.');
  }
  return review;
}
export function validateImage(environment, expectedRevision) {
  assert.match(environment.image, /^ghcr\.io\/[a-z0-9_./-]+@sha256:[a-f0-9]{64}$/);
  assert.equal(environment.marker, imageMarker);
  assert.equal(environment.revision, expectedRevision);
  assert.equal(environment.platform, 'linux');
  assert.equal(environment.arch, 'x64');
  assert.match(environment.revision, /^[a-f0-9]{40}$/);
}
