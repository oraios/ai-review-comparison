import { resolve } from 'node:path';
import { readJson, readAudit, writeJson, root } from './lib.mjs';
import { validateSubmission } from './evidence.mjs';

const directory = resolve(process.argv[2]);
const events = await readAudit(directory);
const review = await readJson(resolve(directory, 'review.json'));
validateSubmission(review, events);
await writeJson(resolve(root, 'docs/evidence/local-validation.json'), {
  status: 'LOCAL_PROTOCOL_VERIFIED', client: 'scripted integration test — NOT an authenticated AI reviewer',
  date: events[0].timestamp.slice(0, 10), authenticated: false, imageVerified: false, published: false,
  environment: await readJson(resolve(directory, 'environment.json')),
  checks: await readJson(resolve(directory, 'checks.json')),
  mcpEvents: events,
  scriptedSubmission: review,
});
console.log('Wrote explicitly unauthenticated local evidence. Candidate status remains BLOCKED.');
