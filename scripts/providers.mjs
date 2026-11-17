// One registry connects setup, labels, PR creation, and trusted dispatch authorization.
export const providers = Object.freeze({
  claude: { label: 'review:claude', color: 'D97757', workflow: 'review-claude.yml', secrets: ['CLAUDE_CODE_OAUTH_TOKEN'] },
  copilot: { label: 'review:copilot', color: '8250DF', workflow: 'review-copilot.yml', secrets: ['COPILOT_GITHUB_TOKEN'] },
  opencode: { label: 'review:opencode', color: '24292F', workflow: 'review-opencode.yml', secrets: ['OPENCODE_GO_API_KEY'] },
});

export function selectProviders(value = Object.keys(providers).join(',')) {
  const selected = [...new Set(value.split(',').map(s => s.trim()).filter(Boolean))];
  if (!selected.length || selected.some(name => !Object.hasOwn(providers, name))) throw new Error(`Choose reviewers from: ${Object.keys(providers).join(',')}`);
  return selected;
}
