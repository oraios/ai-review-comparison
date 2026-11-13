import { resolve } from 'node:path';
import { appendFile } from 'node:fs/promises';
import { github, repository, prNumber } from './github.mjs';
import { authorizeDispatch } from './authorize-dispatch.mjs';
import { snapshotPull } from './pr-snapshot.mjs';
import { writeJson } from './lib.mjs';

const repo = repository(process.env.GITHUB_REPOSITORY);
const number = prNumber(process.env.PR_NUMBER);
await authorizeDispatch({ repo, number, env: process.env, request: github });
const input = await snapshotPull({ repo, number, request: github, workflowRevision: process.env.GITHUB_SHA });
await writeJson(resolve('artifacts/input/input.json'), input);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY,
  `Prepared PR #${number} at ${input.head}. Only validated pricing data is passed to the reviewer.\n`);
