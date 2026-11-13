import { repository, prNumber, validatePull } from './github.mjs';
import { validatePricing } from '../demo/pricing.mjs';

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
    workflowRevision, before, after, path: 'demo/pricing.json' };
}
