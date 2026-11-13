import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { audit, readAudit, readJson, writeJson, marker, root, toolResult } from '../scripts/lib.mjs';
import { checkFixture } from '../scripts/check-fixture.mjs';
import { smoke } from '../scripts/smoke.mjs';
import { validateSubmission, submissionShape } from '../scripts/evidence.mjs';

const directory = resolve(process.argv[2]);
const input = await readJson(resolve(directory, 'input.json'));
const server = new McpServer({ name: 'project-review-fixture', version: '1.0.0' });
server.registerTool('review_context', {
  description: 'Read the immutable PR pricing snapshot, business requirement, trusted source and image provenance. Save the returned receipt.',
  inputSchema: {},
}, async () => {
  const result = { marker, requirement: 'Shipping costs 499 cents below 5000 cents; shipping is free at or above 5000 cents.',
    before: input.before, after: input.after, path: 'demo/pricing.json', head: input.head,
    repository: input.repository, number: input.number, base: input.base,
    instructions: await readFile(resolve(directory, 'prompt.txt'), 'utf8'),
    source: await readFile(resolve(root, 'demo/pricing.mjs'), 'utf8'),
    environment: await readJson(resolve(directory, 'environment.json')) };
  return toolResult(await audit(directory, 'project.review_context', result));
});
let checks;
server.registerTool('run_checks', {
  description: 'Actually run the trusted pricing assertions and Chromium smoke path on the PR JSON. A failed assertion is a regression, not a tool failure. Save the receipt.',
  inputSchema: {},
}, async () => {
  // Cache repeated requests, but never fabricate an execution on the first call.
  checks ??= (async () => {
    const result = { unit: checkFixture(input.after), browser: await smoke(input.after, resolve(directory, 'smoke.png')) };
    await writeJson(resolve(directory, 'checks.json'), result);
    return result;
  })();
  return toolResult(await audit(directory, 'project.run_checks', await checks));
});
server.registerTool('submit_review', {
  description: 'Submit your actual findings after calling review_context, Serena list_dir, and run_checks. Supply their returned receipts to prove consumption. Does not publish to GitHub.',
  inputSchema: submissionShape,
}, async data => {
  try {
    validateSubmission(data, await readAudit(directory));
    await writeJson(resolve(directory, 'review.json'), data);
    await audit(directory, 'project.submit_review', { accepted: true });
    return toolResult({ accepted: true, publication: 'Handled by a separate job after validation.' });
  } catch (error) {
    return { isError: true, ...toolResult({ error: error.message }) };
  }
});
await server.connect(new StdioServerTransport());
