# Subscription-backed PR reviews

We want reviewers that can use a project’s existing Docker environment and inspect its code through Serena MCP, with inference covered by a subscription. The three default reviewers run the agent and Serena together in one GitHub Actions job container.

| Reviewer | Subscription used for inference | Review model and effort | Where the agent and Serena run |
| --- | --- | --- | --- |
| [Claude Code](reviewers/claude/README.md) | Claude Pro or Max | Claude Sonnet 5.5 · medium | Claude Code Action and Serena run in the project image. |
| [Copilot CLI](reviewers/copilot/README.md) | GitHub Copilot seat | Claude Sonnet 5.5 · medium | The CLI and Serena run in the project image. |
| [OpenCode](reviewers/opencode/README.md) | OpenCode Go, with Extra Usage disabled | Kimi K3 · model default | The CLI and Serena run in the project image. |

**Codex Cloud is excluded.** Its hosted GitHub reviewer has no documented way to use the project’s Docker image, either as its base image or through Docker-in-Docker. [Other discarded routes, including gh-aw](docs/DISCARDED.md) · [Verification results](docs/RESULTS.md)

## Start the initial review

After pushing this implementation to `main`, fill in `.env` using [.env.template](.env.template). Choose the reviewers you have subscriptions for in `DEMO_REVIEWERS`. With Node.js 22+ and repository administrator access, run these two commands from the checkout.

```sh
npm run setup-ci-secrets
npm run demo-review-on-gh
```

Setup configures GitHub and waits for the images published from `main`. The demo creates one PR per selected reviewer, requests its review and prints the resulting URLs. Claude and Copilot are requested with a PR comment (`@claude Review this PR.`, `/copilot Review this PR.`); OpenCode with the `review:opencode` label. Each workflow starts Serena inside the project image. [Credentials and first-run setup](docs/SETUP.md)

Each reviewer posts a summary in the PR conversation and attaches findings to the relevant changed lines in **Files changed**. Findings without an available diff line appear in the summary.

## Ask a reviewer on a PR

Each reviewer uses its own trigger. Claude uses its native mention; Copilot uses a slash command because GitHub reserves `@copilot` for its cloud agent, which pushes commits.

| Reviewer | Trigger | Where |
| --- | --- | --- |
| Claude Code | `@claude QUESTION` anywhere in the comment | PR conversation, inline review threads, review bodies |
| Copilot CLI | `/copilot QUESTION` at the start of the comment | PR conversation, inline review threads |
| OpenCode | `/review opencode QUESTION` at the start of the comment | PR conversation |

```text
@claude Which test supports your finding? Cite the observed result.
```

A request from someone with write access starts a fresh session on the current PR head. Claude and Copilot read the earlier discussion themselves and answer in the same conversation or thread. They may run the project's checks but never push. [Triggers in detail](docs/TRIGGER_MATRIX.md)
