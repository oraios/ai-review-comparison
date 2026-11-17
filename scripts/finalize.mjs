import { resolve } from 'node:path';
import { appendFile } from 'node:fs/promises';
import { readJson, readAudit, writeJson } from './lib.mjs';
import { validateSubmission, validateImage } from './evidence.mjs';

const directory = resolve(process.argv[2]);
let result;
try {
  const input = await readJson(resolve(directory, 'input.json'));
  const environment = await readJson(resolve(directory, 'environment.json'));
  if (environment.imageRole !== 'agent-and-mcp-tools') throw new Error('Comparator tools image cannot qualify as an agent-image run.');
  validateImage(environment);
  if (process.env.AGENT_OUTCOME !== 'success') throw new Error('AUTH_OR_AGENT: credential preflight or reviewer invocation failed. See the failed step.');
  const review = validateSubmission(await readJson(resolve(directory, 'review.json')), await readAudit(directory));
  result = { status: 'READY_TO_PUBLISH', input, environment, review,
    evidence: { image: true, context: true, serena: true, checks: true, published: false } };
} catch (error) {
  result = { status: 'BLOCKED', reason: error.message, evidence: { published: false } };
  process.exitCode = 1;
}
await writeJson(resolve(directory, 'result.json'), result);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY,
  `\nReviewer evidence: **${result.status}**${result.reason ? ` — ${result.reason}` : '. Publishing is a separate job.'}\n`);
console.log(JSON.stringify({ status: result.status, reason: result.reason }));
