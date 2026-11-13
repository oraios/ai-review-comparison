import { readFile, writeFile, mkdir, appendFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

export const root = resolve(import.meta.dirname, '..');
export const marker = 'MCP_DEMO_OK_2026';
export const imageMarker = 'REVIEW_IMAGE_OK_2026';
export const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
export async function writeJson(path, data) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 2) + '\n');
}
export async function audit(directory, tool, result) {
  const event = { tool, receipt: randomUUID(), timestamp: new Date().toISOString(), result };
  await mkdir(directory, { recursive: true });
  await appendFile(resolve(directory, 'mcp.jsonl'), JSON.stringify(event) + '\n');
  return event;
}
export async function readAudit(directory) {
  return (await readFile(resolve(directory, 'mcp.jsonl'), 'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);
}
export function cleanEnv(extra = {}) {
  // Allowlist, not a growing list of token names. Used before launching MCP/browser processes.
  const keys = ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'PATHEXT', 'TEMP', 'TMP', 'LANG', 'PLAYWRIGHT_BROWSERS_PATH'];
  return { ...Object.fromEntries(keys.filter(k => process.env[k]).map(k => [k, process.env[k]])), ...extra };
}
export const toolResult = data => ({ content: [{ type: 'text', text: JSON.stringify(data) }] });
