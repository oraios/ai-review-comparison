import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';

export function renderWorkflow(template, { repo, main, projectDigest, agentDigest }) {
  assert.match(main, /^[a-f0-9]{40}$/);
  for (const digest of [projectDigest, agentDigest]) assert.match(digest, /^sha256:[a-f0-9]{64}$/);
  assert.match(repo, /^[a-z0-9-]+\/[a-z0-9._-]+$/i);
  const base = `ghcr.io/${repo.toLowerCase()}/review-env`;
  return template
    .replaceAll('__PROJECT_IMAGE__', `${base}:sha-${main}@${projectDigest}`)
    .replaceAll('__AGENT_IMAGE__', `${base}-awf:sha-${main}@${agentDigest}`);
}

if (process.argv[1] === import.meta.filename) {
  const [repo, main, projectDigest, agentDigest] = process.argv.slice(2);
  const template = await readFile('reviewers/github-aw/workflow.md.in', 'utf8');
  await writeFile('.github/workflows/aw-image-example.md', renderWorkflow(template, { repo, main, projectDigest, agentDigest }));
}
