import assert from 'node:assert/strict';

export function repository(value) {
  assert.match(value ?? '', /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, 'Invalid repository.');
  return value;
}
export function prNumber(value) {
  assert.match(String(value), /^[1-9][0-9]{0,8}$/, 'PR number must be a positive integer.');
  return Number(value);
}
export async function github(path, options = {}) {
  const token = process.env.GH_TOKEN;
  assert.ok(token, 'GH_TOKEN is missing.');
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`GitHub request failed (${response.status}): ${path.split('?')[0]}`);
  return response.json();
}
export function authorizeActor(permission) {
  assert.ok(['admin', 'maintain', 'write'].includes(permission), 'Only a repository maintainer may invoke reviews.');
}
export function validatePull(pr, repo, files) {
  assert.equal(pr.state, 'open', 'PR must be open.');
  assert.equal(pr.head.repo?.full_name.toLowerCase(), repo.toLowerCase(), 'Fork PRs are blocked.');
  assert.equal(pr.base.ref, 'main', 'PR must target main.');
  assert.equal(pr.changed_files, 1, 'Only the fixture JSON may change.');
  assert.equal(files.length, 1, 'Exactly one changed file is required.');
  assert.equal(files[0].filename, 'demo/pricing.json', 'Executable PR changes are blocked.');
  assert.equal(files[0].status, 'modified', 'The pricing file must be modified, not replaced or renamed.');
  assert.match(pr.head.sha, /^[a-f0-9]{40}$/);
  assert.match(pr.base.sha, /^[a-f0-9]{40}$/);
}
