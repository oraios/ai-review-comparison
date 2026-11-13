import assert from 'node:assert/strict';
import { resolve, join } from 'node:path';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { homedir } from 'node:os';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { prepareRun } from './prepare-run.mjs';
import { root, readJson, readAudit, writeJson, cleanEnv } from './lib.mjs';
import { validateSubmission } from './evidence.mjs';

const command = process.argv[2] || (process.platform === 'win32'
  ? resolve('.venv-serena/Scripts/serena.exe') : '/opt/serena-venv/bin/serena');
const parent = resolve(process.argv[3] || 'artifacts/local');
await mkdir(parent, { recursive: true });
const directory = await mkdtemp(join(parent, 'run-'));
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = process.platform === 'win32'
    ? join(process.env.LOCALAPPDATA, 'ms-playwright')
    : join(homedir(), process.platform === 'darwin' ? 'Library/Caches/ms-playwright' : '.cache/ms-playwright');
}
const inputPath = resolve(directory, 'seed.json');
await writeJson(inputPath, { repository: 'local/demo', number: 1, head: 'local-only', workflowRevision: 'local',
  before: { freeShippingMinCents: 5000, shippingCents: 499 }, after: { freeShippingMinCents: 500, shippingCents: 499 } });
await prepareRun({ reviewer: 'local', inputPath, directory, local: true, serenaCommand: command });
const clients = [];
try {
  async function connect(name) {
    const client = new Client({ name: 'local-protocol-test', version: '1.0.0' });
    clients.push(client);
    await client.connect(new StdioClientTransport({ command: process.execPath,
      args: [resolve(root, 'mcp/launch.mjs'), name, directory], env: cleanEnv(), stderr: 'inherit' }), { timeout: 120_000 });
    return client;
  }
  const project = await connect('project');
  const serena = await connect('serena');
  async function call(client, name, args = {}) {
    const response = await client.callTool({ name, arguments: args }, undefined, { timeout: 120_000 });
    assert.ok(!response.isError, JSON.stringify(response));
    return JSON.parse(response.content[0].text);
  }
  const context = await call(project, 'review_context');
  const listing = await call(serena, 'list_dir', { relative_path: '.', recursive: false });
  const denied = await serena.callTool({ name: 'list_dir', arguments: { relative_path: '..', recursive: false } });
  assert.equal(denied.isError, true, 'Traversal must be rejected.');
  const checks = await call(project, 'run_checks');
  assert.equal(checks.result.unit.status, 'failed');
  assert.equal(checks.result.browser.status, 'failed');
  const review = { summary: 'Protocol integration test, not an AI review: the intentional threshold regression was reproduced.',
    findings: [{ title: 'Free shipping starts at $5 instead of $50', body: 'The threshold changed from 5000 to 500 cents. At 4999 cents, the fixture returns zero shipping instead of 499 cents. Restore the 5000-cent threshold.',
      path: 'demo/pricing.json', severity: 'P2' }], contextReceipt: context.receipt, serenaReceipt: listing.receipt,
    checksReceipt: checks.receipt, observedMarker: context.result.marker,
    observedUnitStatus: checks.result.unit.status, observedBrowserStatus: checks.result.browser.status };
  await call(project, 'submit_review', review);
  validateSubmission(await readJson(resolve(directory, 'review.json')), await readAudit(directory));
  await writeJson(resolve(directory, 'local-result.json'), {
    status: 'LOCAL_PROTOCOL_VERIFIED', authenticated: false, published: false,
    note: 'Real Serena + stdio MCP + Chromium; scripted client, no model. Not a candidate PASS.',
  });
  console.log(`Real Serena and both checks verified. Evidence: ${directory}`);
} finally {
  await Promise.allSettled(clients.map(client => client.close()));
}
