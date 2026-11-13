import { resolve } from 'node:path';
import { readJson, readAudit, writeJson } from './lib.mjs';
import { validateSubmission, validateImage } from './evidence.mjs';

const directory = resolve(process.argv[2]);
const environment = await readJson(resolve(directory, 'environment.json'));
const input = await readJson(resolve(directory, 'input.json'));
if (environment.reviewer !== 'github-aw') throw new Error('Unexpected comparator.');
validateImage(environment, input.workflowRevision);
const review = validateSubmission(await readJson(resolve(directory, 'review.json')), await readAudit(directory));
await writeJson(resolve(directory, 'result.json'), {
  status: 'COMPARATOR_EVIDENCE_VERIFIED', reviewer: 'github-aw',
  agentRuntime: 'github-aw managed sandbox', toolsImage: environment.image,
  repository: input.repository, number: input.number, head: input.head,
  published: false, findings: review.findings.length,
  input, environment, review, evidence: { published: false },
});
console.log('COMPARATOR_EVIDENCE_VERIFIED — ready for separate publication; tools image only.');
