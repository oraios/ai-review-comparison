import assert from 'node:assert/strict';
import { authorizeActor } from './github.mjs';
import { providers } from './providers.mjs';

export async function authorizeDispatch({ repo, number, env, request }) {
  assert.equal(env.GITHUB_EVENT_NAME, 'workflow_dispatch');
  assert.equal(env.GITHUB_REF, 'refs/heads/main');
  assert.ok(providers[env.REVIEWER], 'Unknown reviewer.');
  const actors = new Set([env.GITHUB_ACTOR, env.GITHUB_TRIGGERING_ACTOR].filter(Boolean));
  assert.ok(actors.size, 'Missing dispatch identity.');
  if (actors.has('github-actions[bot]')) {
    assert.match(env.ROUTER_RUN_ID ?? '', /^[1-9][0-9]{0,19}$/, 'Bot dispatch requires a label-router run.');
    const run = await request(`/repos/${repo}/actions/runs/${env.ROUTER_RUN_ID}`);
    const workflow = await request(`/repos/${repo}/actions/workflows/review-label.yml`);
    assert.equal(run.workflow_id, workflow.id, 'Unexpected dispatching workflow.');
    assert.equal(run.event, 'pull_request_target');
    assert.equal(run.path, '.github/workflows/review-label.yml');
    assert.equal(run.repository.full_name.toLowerCase(), repo.toLowerCase());
    assert.ok(run.actor?.login && run.actor.login !== 'github-actions[bot]', 'A human must set the label.');
    const pr = await request(`/repos/${repo}/pulls/${number}`);
    assert.ok(pr.labels.some(label => label.name === providers[env.REVIEWER].label), 'Review label was removed.');
    actors.delete('github-actions[bot]');
    actors.add(run.actor.login);
    if (run.triggering_actor?.login) actors.add(run.triggering_actor.login);
  }
  for (const actor of actors) {
    const access = await request(`/repos/${repo}/collaborators/${encodeURIComponent(actor)}/permission`);
    authorizeActor(access.permission);
  }
}
