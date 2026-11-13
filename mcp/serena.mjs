import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { z } from 'zod';
import { resolve } from 'node:path';
import { audit, cleanEnv, readJson, toolResult } from '../scripts/lib.mjs';

const directory = resolve(process.argv[2]);
const config = await readJson(resolve(directory, 'serena-runtime.json'));
const client = new Client({ name: 'serena-review-audit', version: '1.0.0' });
const transport = new StdioClientTransport({ command: config.command, args: config.args,
  env: cleanEnv({ HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE, SERENA_HOME: process.env.SERENA_HOME }), stderr: 'pipe' });
// Do not relay upstream logs: the reviewed evidence is tool output, not arbitrary process output.
await client.connect(transport, { timeout: 120_000 });
transport.stderr?.resume();
const tools = await client.listTools();
if (!tools.tools.some(t => t.name === 'list_dir')) throw new Error('Pinned Serena did not expose list_dir.');
const server = new McpServer({ name: 'serena', version: '1.0.0' });
// This adapter exposes a real Serena MCP operation while enforcing a narrow argument boundary.
// Neither Python REPL nor shell/edit/activation tools are reachable through it.
server.registerTool('list_dir', {
  description: 'Use the real Serena MCP server to inspect the demo project root. The audit adapter adds a receipt after the actual upstream response.',
  inputSchema: { relative_path: z.literal('.'), recursive: z.literal(false) },
}, async args => {
  const response = await client.callTool({ name: 'list_dir', arguments: args });
  if (response.isError || !JSON.stringify(response).includes('pricing.json')) {
    return { isError: true, ...toolResult({ error: 'Serena did not return the expected fixture directory.' }) };
  }
  return toolResult(await audit(directory, 'serena.list_dir', { upstream: response, source: config.source }));
});
server.onclose = () => { void client.close(); };
await server.connect(new StdioServerTransport());
