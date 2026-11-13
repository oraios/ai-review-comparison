# Review triggers

The demo separates event routing from the review agent. Applying a provider label dispatches an authorized review on main. A manual PR-number trigger supplies the same stable context; a native mention or hosted UI provides a different product experience. Opening or pushing a PR alone does not start inference.

## Shipped paths

| Path | Enabled trigger | Context | Result |
| --- | --- | --- | --- |
| Claude Code Action | `review:claude` or `workflow_dispatch` on main | Validated numeric PR snapshot + assembled prompt | Separate validated PR COMMENT review |
| Copilot CLI | `review:copilot` or manual dispatch | Same | Same |
| OpenCode CLI | `review:opencode` or manual dispatch | Same; Go subscription model | Same |
| OpenHands SDK | `review:openhands` or manual dispatch | Same; explicitly API-funded model | Same |
| github-aw Codex | `review:github-aw` or manual dispatch via compiled lock | Same snapshot/instructions through project MCP | Separate comparator PR COMMENT review and evidence |
| OpenAI-hosted Codex | User-configured `@codex review`, automatic review, or cloud task | Host PR context or generated prompt | Host-native review/task |
| GitHub-hosted Codex | User-selected agent task, supported assignment/mention | Host context or generated prompt | Host-native task/review output |
| Cline / goose ACP | None | Proposed prompts/templates | Disabled prototypes |
| Local image/native runner | `npm run review:local -- --reviewer NAME --pr NUMBER` | Same validated fixture snapshot through existing `gh` auth | Local report and receipts; no publication |

The hosted paths are guides, not integrations this repo has installed. `scripts/hosted-prompt.mjs OWNER/REPO NUMBER` reads PR metadata using the caller's `gh` login and writes a prompt; it never sends it. All authenticated hosted behavior remains untested here. [Local execution](LOCAL_RUNS.md) documents Docker/native preparation, shell credentials, synthetic fixtures, and github-aw's compile-only local capabilities.

## Native capabilities versus future glue

| Event | Native support or custom implementation | Enabled here? |
| --- | --- | --- |
| Manual selected PR | All implemented harnesses use custom routing; github-aw compiles it | Yes, after setup |
| PR opened/synchronize/reopened/ready-for-review | Claude/OpenCode integrate; other CLIs can use Actions glue; OpenAI has configured automatic review | Only credential-free fixture CI by default |
| PR command comment | Claude `@claude`; OpenCode `/oc` or `/opencode`; hosted Codex integrations | Only after separately configuring the relevant hosted/native integration |
| Inline review comment | Native Claude/OpenCode integration or a custom router | No local AI workflow listens to it |
| Label | Trusted `pull_request_target: labeled` router, fixed workflow map, actor checks | Yes, five provider labels |
| Review request | Would require explicit routing and author checks | No |
| Schedule | Discover eligible PRs, bound usage, avoid repeats; framework scheduling available | No |
| Fork / first-time contributor | Ordinary credential-free CI; provider-bearing fixture preflight rejects forks | No credentialed fixture reviews |

Changing YAML events alone does not work: `prepare-pr.mjs` requires a main-branch dispatch. The label router has no checkout, no model secrets, and only dispatches a fixed workflow name. A bot dispatch must supply a verifiable router run; preparation queries its workflow identity and human actor permissions and checks the current label. Applying labels with your personal `gh` login triggers the router. A label left on a PR does not review later pushes; remove/reapply it to retry. Any future comment router must validate event, author, repository, selected commit, and fixture before invoking inference.

## Preflight and publication rules

The current preflight accepts only positive integer PR numbers, open same-repository PRs targeting main, and exactly one modified numeric `demo/pricing.json`. It rejects forks, renamed files, executable changes, unknown JSON fields, and a moving head/base. Both the original actor and rerun initiator must have write/maintain/admin access.

The main image must match the dispatched workflow revision. Ordinary image reviewers publish only after real MCP/check receipts and image provenance validate; the publisher rechecks the PR head and uses that immutable commit ID. github-aw validates its tools-image evidence separately and publishes through a post-agent job gated by the compiler's detection job. Its result is `COMPARATOR_REVIEW_PUBLISHED`, not the ordinary custom-agent-image PASS.

GitHub may require approval for a first-time contributor's credential-free CI. That does not authorize a provider-bearing fork review. A maintainer can create a separately inspected, same-repository JSON-only fixture branch for the live demo.

## Primary references

- [Claude triggers](https://github.com/anthropics/claude-code-action/blob/main/docs/migration-guide.md)
- [Copilot CLI in Actions](https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli-in-actions)
- [OpenCode Action, events and prompts](https://opencode.ai/v1/docs/github)
- [github-aw workflow creation](https://github.github.io/gh-aw/setup/creating-workflows/)
- [OpenAI Codex GitHub integration](https://learn.chatgpt.com/docs/third-party/github)
- [GitHub third-party agents](https://docs.github.com/en/copilot/concepts/agent-capabilities/about-agents/about-third-party-coding-agents)
