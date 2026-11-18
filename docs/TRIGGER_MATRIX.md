# Trigger a review on GitHub

| Reviewer | Request a review or ask a question | Workflow |
| --- | --- | --- |
| Claude Code | `/claude QUESTION` in a PR comment, inline review comment or review body | `review-claude.yml` |
| Copilot CLI | `/copilot QUESTION` at the start of a PR comment, inline review comment or review body | `review-copilot.yml` |
| OpenCode | `review:opencode` label, or `/oc QUESTION` (or `/opencode`) in a PR comment, inline review comment or review body | `review-opencode.yml` |

## Who can trigger a reviewer

Each workflow's job starts only when the comment or review comes from a repository owner, organization member or collaborator (`author_association`). Everyone else's comments are skipped before a runner starts. Members and collaborators can have read-only access, so each job then requires write access: Claude Code Action and `opencode github run` check it themselves, and the Copilot workflow and OpenCode's workaround path look it up with the GitHub API. Applying the `review:opencode` label requires triage access, and `opencode github run` also checks the labeller's write access.

## Claude Code: `/claude`

`review-claude.yml` runs Claude Code Action without a `prompt` input, which puts it in its interactive mode. The comment that contains `/claude` is the prompt; the workflow sets the action's `trigger_phrase` to `/claude` instead of the default `@claude`, which would mention a GitHub user. The action checks that the commenter has write access, checks out the PR head, adds the PR body, diff and discussion to the context, shows progress in a tracking comment and answers there. In an inline thread it replies in that thread. Line-specific findings are posted with the action's inline-comment tool.

The job runs in the project image; `claude_args` adds Serena MCP and review guidance (`review/INSTRUCTIONS.md`). The job token can comment but not push.

## Copilot CLI: `/copilot`

`@copilot` in a PR starts GitHub's own Copilot cloud agent, which makes commits, and native Copilot code review does not read replies to its comments. This demo therefore uses a slash command. `review-copilot.yml` reproduces what the Claude action does itself:

- the job starts for comments beginning with `/copilot` and stops unless the commenter has write, maintain or admin permission;
- it reacts with 👀 (GitHub has no reactions on submitted reviews), checks out the PR head and starts Serena in the project image;
- the prompt names the PR and comment; Copilot reads the PR and discussion with `gh`;
- Copilot posts a summary with `gh pr comment` and inline findings through the review-comments API, or replies in the inline thread it was asked in. A request in a review body is answered in the PR conversation.

## OpenCode: `/oc`

`review-opencode.yml` has two paths that share the job, image and OpenCode config:

- **Native**, for `/oc` or `/opencode` in a PR conversation comment and for the `review:opencode` label: `opencode github run`, OpenCode's own GitHub agent (what the upstream `anomalyco/opencode/github` action runs), from the CLI pinned in the image. It checks the requester's write access, reacts with 👀, checks out the PR branch, builds the prompt from the PR and answers in the conversation. The label uses OpenCode's default prompt, "Review this pull request".
- **Workaround**, for `/oc` in an inline review thread or in the text of a submitted review: plain `opencode run`. Up to v1.19.6 the native agent answers inline-thread questions with a top-level comment and rejects submitted reviews. The workflow checks write access, reacts with 👀 on inline comments, checks out the PR head and passes the thread's file, line and diff; the agent replies in the thread, or in the conversation for a review.

The workflow passes an OpenCode config with the Go provider, Serena MCP, denied file edits and two instruction files (`review/INSTRUCTIONS.md`, `reviewers/opencode/github.md`).

[Setup](SETUP.md) · [Security model](SECURITY.md)
