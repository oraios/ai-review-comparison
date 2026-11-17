import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { appendFile } from 'node:fs/promises';
import { readJson, readAudit, writeJson } from './lib.mjs';
import { github, repository, prNumber, validatePull } from './github.mjs';
import { validateSubmission, validateImage } from './evidence.mjs';

export function reviewBody(result) {
  const { input, environment: env, review } = result;
  // Prevent mentions and untrusted HTML from being rendered as active notifications/markup.
  const safe = text => text.replaceAll('@', '@\u200b').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return [`<!-- ai-review-demo:${env.reviewer}:${input.head}:${env.run}:${env.attempt} -->`,
    `## AI review demo · ${env.reviewer}`, `Model: \`${env.model}\` · Auth: \`${env.auth}\``,
    `Version manifest: \`${JSON.stringify(env.versions)}\``, `Commit: \`${input.head}\``,
    `Agent and MCP image: \`${env.image}\``, `Image source: \`${env.revision}\` · Marker: \`${env.marker}\``,
    `MCP: context marker consumed; real Serena list_dir consumed; unit + Chromium checks executed.`,
    `Checks: unit **${review.observedUnitStatus}**, browser **${review.observedBrowserStatus}**.`,
    safe(review.summary), ...review.findings.map(f => `### [${f.severity}] ${safe(f.title)}\n\n\`demo/pricing.json\`\n\n${safe(f.body)}`),
    `[Run and evidence](https://github.com/${input.repository}/actions/runs/${env.run})`,
    'This summary is an independent demo review, not an approval or a merge decision.'].join('\n\n');
}

export async function publishResult(result, { env = process.env, request = github, audit }) {
  assert.equal(result.status, 'READY_TO_PUBLISH');
  assert.equal(result.input.repository, repository(env.GITHUB_REPOSITORY));
  assert.equal(result.input.number, prNumber(env.PR_NUMBER));
  assert.equal(result.environment.reviewer, env.REVIEWER);
  assert.equal(result.environment.imageRole, 'agent-and-mcp-tools');
  assert.equal(result.environment.run, env.GITHUB_RUN_ID);
  assert.equal(result.environment.attempt, env.GITHUB_RUN_ATTEMPT);
  validateImage(result.environment, env.GITHUB_SHA);
  validateSubmission(result.review, audit);
  const { repository: repo, number, head } = result.input;
  const current = await request(`/repos/${repo}/pulls/${number}`);
  validatePull(current, repo, await request(`/repos/${repo}/pulls/${number}/files?per_page=100`));
  assert.equal(current.head.sha, head, 'PR head changed. Dispatch a new review.');
  // Explicit commit_id keeps the published review associated with the inspected snapshot.
  const published = await request(`/repos/${repo}/pulls/${number}/reviews`, {
    method: 'POST', body: JSON.stringify({ commit_id: head, event: 'COMMENT', body: reviewBody(result) }),
  });
  assert.ok(published.id && published.html_url, 'No GitHub publication receipt.');
  result.status = 'PASS';
  result.evidence.published = true;
  result.publication = { id: published.id, url: published.html_url, commit: head };
  return result;
}

if (process.argv[1] === import.meta.filename) {
  const directory = resolve(process.argv[2]);
  const result = await readJson(resolve(directory, 'result.json'));
  try {
    await publishResult(result, { audit: await readAudit(directory) });
  } catch (error) {
    result.status = 'BLOCKED'; result.reason = `PUBLISH: ${error.message}`; process.exitCode = 1;
  }
  await writeJson(resolve(directory, 'published.json'), result);
  await appendFile(process.env.GITHUB_STEP_SUMMARY, `\n**${result.status}**${result.publication ? ` — [PR review](${result.publication.url})` : ` — ${result.reason}`}\n`);
  console.log(JSON.stringify({ status: result.status, publication: result.publication, reason: result.reason }));
}
