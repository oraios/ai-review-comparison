import { resolve } from 'node:path';
import { appendFile } from 'node:fs/promises';
import { github, repository, prNumber } from './github.mjs';
import { authorizeDispatch } from './authorize-dispatch.mjs';
import { snapshotPull } from './pr-snapshot.mjs';
import { writeJson } from './lib.mjs';

const repo = repository(process.env.GITHUB_REPOSITORY);
const number = prNumber(process.env.PR_NUMBER);
const followUp = await authorizeDispatch({ repo, number, env: process.env, request: github });
const input = await snapshotPull({ repo, number, request: github, workflowRevision: process.env.GITHUB_SHA });
if (followUp) {
  let previous;
  for (let page = 1; ; page++) {
    const reviews = await github(`/repos/${repo}/pulls/${number}/reviews?per_page=100&page=${page}`);
    previous = reviews.findLast(review => review.user?.login === 'github-actions[bot]' &&
      review.body?.startsWith(`<!-- ai-review-demo:${process.env.REVIEWER}:`)) ?? previous;
    if (reviews.length < 100) break;
  }
  input.followUp = { ...followUp, ...(previous ? { previousReview: previous.body.slice(0, 6000), previousHead: previous.commit_id } : {}) };
}
await writeJson(resolve('artifacts/input/input.json'), input);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY,
  `Prepared PR #${number} at ${input.head}. Only validated pricing data is passed to the reviewer.\n`);
