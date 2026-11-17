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

Setup configures GitHub and waits for the review image published from `main`. The demo creates one PR per selected reviewer, requests its review and prints the resulting URLs. Claude and Copilot are requested with a PR comment (`@claude Review this PR.`, `/copilot Review this PR.`); OpenCode with the `review:opencode` label. Each workflow starts Serena inside the project image, `ghcr.io/oraios/ai-review-comparison/review-env:main`. In a fork, change that image name in the three `review-*.yml` workflows. [Credentials and first-run setup](docs/SETUP.md)

Each reviewer posts its own summary in the PR conversation and is instructed to attach findings to the relevant changed lines in **Files changed**.

Pushes to `main` rebuild the image. Put `[skip-image-build]` in the last commit message of a push to keep the previous image, for example for docs or workflow changes.

## Request a review on any PR

Each reviewer uses its own trigger. Claude and OpenCode use their native triggers (`@claude`, `/oc`); Copilot uses a slash command because GitHub reserves `@copilot` for its cloud agent, which pushes commits. Claude and Copilot have no label: the first review is requested with a comment, just like any later question.

| Reviewer | Initial review | Follow-up question | Where follow-ups work |
| --- | --- | --- | --- |
| Claude Code | Comment `@claude Review this PR.` | `@claude QUESTION` anywhere in the comment | PR conversation, inline review threads, the overall text of a submitted review |
| Copilot CLI | Comment `/copilot Review this PR.` | `/copilot QUESTION` at the start of the comment | PR conversation, inline review threads, the overall text of a submitted review |
| OpenCode | Apply the `review:opencode` label | `/oc QUESTION` (or `/opencode`) anywhere in the comment | PR conversation, inline review threads (answered in the conversation) |

```text
@claude Which test supports your finding? Cite the observed result.
```

A request from someone with write access starts a fresh session on the current PR head. The agents read the earlier discussion themselves. Claude and Copilot answer in the same conversation or thread; OpenCode always answers in the conversation. They may run the project's checks; their job token cannot push. [Triggers in detail](docs/TRIGGER_MATRIX.md)
