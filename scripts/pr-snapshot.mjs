import { repository, prNumber, validatePull } from './github.mjs';
import { validatePricing } from '../demo/pricing.mjs';

// Keep GitHub's original line numbers and expose only known pricing keys from PR text.
export function changedReviewLines(patch) {
  const locations = [];
  let left, right;
  for (const row of (patch ?? '').split('\n')) {
    const hunk = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(row);
    if (hunk) {
      left = Number(hunk[1]);
      right = Number(hunk[2]);
    } else if (right !== undefined) {
      const prefix = row[0];
      if (prefix === '+' || prefix === '-') {
        const fields = Array.from(row.matchAll(/"(freeShippingMinCents|shippingCents)"\s*:/g), match => match[1]);
        locations.push(prefix === '+' ? { side: 'RIGHT', line: right++, fields } : { side: 'LEFT', line: left++, fields });
      } else if (prefix === ' ') {
        left++;
        right++;
      }
    }
  }
  return locations;
}

// Both Actions and the local gh client use this immutable, numeric-only snapshot.
export async function snapshotPull({ repo, number, request, workflowRevision }) {
  repo = repository(repo); number = prNumber(number);
  const pr = await request(`/repos/${repo}/pulls/${number}`);
  const files = await request(`/repos/${repo}/pulls/${number}/files?per_page=100`);
  validatePull(pr, repo, files);
  async function pricingAt(sha) {
    const file = await request(`/repos/${repo}/contents/demo/pricing.json?ref=${sha}`);
    if (file.type !== 'file' || file.encoding !== 'base64' || file.size > 1024) throw new Error('Invalid pricing blob.');
    return validatePricing(JSON.parse(Buffer.from(file.content, 'base64').toString('utf8')));
  }
  const before = await pricingAt(pr.base.sha);
  const after = await pricingAt(pr.head.sha);
  const fresh = await request(`/repos/${repo}/pulls/${number}`);
  if (fresh.head.sha !== pr.head.sha || fresh.base.sha !== pr.base.sha) throw new Error('PR moved during preparation. Rerun.');
  return { repository: repo, number, head: pr.head.sha, base: pr.base.sha,
    workflowRevision, before, after, path: files[0].filename, changedLines: changedReviewLines(files[0].patch) };
}
