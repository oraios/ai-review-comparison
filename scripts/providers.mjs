// One registry connects setup, PR creation and triggers. Each workflow listens to GitHub events itself:
// Claude and Copilot start from a PR comment, OpenCode's native agent from the review:opencode label.
export const providers = Object.freeze({
  claude: { command: '/claude Review this PR.', workflow: 'review-claude.yml', secrets: ['CLAUDE_CODE_OAUTH_TOKEN'] },
  copilot: { command: '/copilot Review this PR.', workflow: 'review-copilot.yml', secrets: ['COPILOT_GITHUB_TOKEN'] },
  opencode: { label: 'review:opencode', color: '24292F', workflow: 'review-opencode.yml', secrets: ['OPENCODE_GO_API_KEY'] },
});

export const labelled = Object.freeze(Object.fromEntries(Object.entries(providers).filter(([, provider]) => provider.label)));

export function selectProviders(value = Object.keys(providers).join(',')) {
  const selected = [...new Set(value.split(',').map(s => s.trim()).filter(Boolean))];
  if (!selected.length || selected.some(name => !Object.hasOwn(providers, name))) throw new Error(`Choose reviewers from: ${Object.keys(providers).join(',')}`);
  return selected;
}
