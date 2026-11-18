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

Setup configures GitHub and waits for the review image published from `main`. The demo creates one PR per selected reviewer, requests its review and prints the resulting URLs. Claude and Copilot are requested with a PR comment (`/claude Review this PR.`, `/copilot Review this PR.`); OpenCode with the `review:opencode` label. Each workflow starts Serena inside the project image, `ghcr.io/oraios/ai-review-comparison/review-env:main`. In a fork, change that image name in the three `review-*.yml` workflows and in `scripts/check-workflows.mjs`. [Credentials and first-run setup](docs/SETUP.md)

Each reviewer posts its own summary in the PR conversation and is instructed to attach findings to the relevant changed lines in **Files changed**.

Pushes to `main` rebuild the image. Put `[skip-image-build]` in the last commit message of a push to keep the previous image, for example for docs or workflow changes.

## Request a review on any PR

Each reviewer uses a slash command. OpenCode's `/oc` is its native trigger. Claude's action defaults to `@claude`; this demo sets it to `/claude` so the comment does not mention a GitHub user. `@copilot` is reserved by GitHub for its cloud agent, which pushes commits. Claude and Copilot have no label: the first review is requested with a comment, just like any later question.

| Reviewer | Initial review | Follow-up question | Where follow-ups work |
| --- | --- | --- | --- |
| Claude Code | Comment `/claude Review this PR.` | `/claude QUESTION` anywhere in the comment | PR conversation, inline review threads, the overall text of a submitted review |
| Copilot CLI | Comment `/copilot Review this PR.` | `/copilot QUESTION` at the start of the comment | PR conversation, inline review threads, the overall text of a submitted review |
| OpenCode | Apply the `review:opencode` label | `/oc QUESTION` (or `/opencode`) anywhere in the comment | PR conversation, inline review threads, the overall text of a submitted review |

```text
/claude Which test supports your finding? Cite the observed result.
```

Only maintainers can trigger a reviewer. Comments from anyone who is not a repository owner, organization member or collaborator are skipped before a runner starts, and each job then requires write access; applying a label already requires triage access. A permitted request starts a fresh session on the current PR head. The agents read the earlier discussion themselves and answer in the same conversation or thread; a request in a review's text is answered in the conversation. They may run the project's checks; their job token cannot push. [Triggers in detail](docs/TRIGGER_MATRIX.md)

## Where this deviates from the standard setups

Each reviewer starts from its vendor's documented GitHub setup and changes only what the demo needs. Every reviewer README lists its deviations and the reasons.

- **Common to all three:** the job runs in the project image so the agent and Serena share the project's environment; a git `safe.directory` step makes git work in that container; a job-level `author_association` filter skips strangers' comments before a runner starts; the job token cannot push; comments come from `github-actions[bot]` instead of a vendor GitHub App.
- **[Claude Code](reviewers/claude/README.md):** `/claude` instead of `@claude`; `claude_args` add Serena, `Bash`, the inline-comment tool and review guidance.
- **[Copilot CLI](reviewers/copilot/README.md):** no vendor comment integration exists, so the workflow is custom: `/copilot` (because `@copilot` starts the cloud agent), its own permission check, reaction, checkout and posting instructions.
- **[OpenCode](reviewers/opencode/README.md):** `opencode github run` from the image instead of the installer action; a config file for the Go provider, Serena and denied edits; a workaround path for inline threads and review texts, which the native agent answers in the wrong place or rejects.
