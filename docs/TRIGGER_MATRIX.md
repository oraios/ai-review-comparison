# Trigger a review on GitHub

| Reviewer | Request a review or ask a question | Workflow |
| --- | --- | --- |
| Claude Code | `@claude QUESTION` in a PR comment, inline review comment or review body | `review-claude.yml` |
| Copilot CLI | `/copilot QUESTION` at the start of a PR comment, inline review comment or review body | `review-copilot.yml` |
| OpenCode | `review:opencode` label, or `/oc QUESTION` (or `/opencode`) in a PR comment or inline review comment | `review-opencode.yml` |

## Claude Code: native `@claude`

`review-claude.yml` runs Claude Code Action without a `prompt` input, which puts it in its interactive mode. The comment that mentions `@claude` is the prompt. The action checks that the commenter has write access, checks out the PR head, adds the PR body, diff and discussion to the context, shows progress in a tracking comment and answers there. In an inline thread it replies in that thread. Line-specific findings are posted with the action's inline-comment tool.

The job runs in the project image; `claude_args` adds Serena MCP and review guidance (`review/INSTRUCTIONS.md`). The job token can comment but not push.

## Copilot CLI: `/copilot`

`@copilot` in a PR starts GitHub's own Copilot cloud agent, which makes commits, and native Copilot code review does not read replies to its comments. This demo therefore uses a slash command. `review-copilot.yml` reproduces what the Claude action does itself:

- the job starts for comments beginning with `/copilot` and stops unless the commenter has write, maintain or admin permission;
- it reacts with 👀 (GitHub has no reactions on submitted reviews), checks out the PR head and starts Serena in the project image;
- the prompt names the PR and comment; Copilot reads the PR and discussion with `gh`;
- Copilot posts a summary with `gh pr comment` and inline findings through the review-comments API, or replies in the inline thread it was asked in. A request in a review body is answered in the PR conversation.

## OpenCode: native `/oc`

`review-opencode.yml` runs `opencode github run`, OpenCode's own GitHub agent (what the upstream `anomalyco/opencode/github` action runs), from the CLI pinned in the project image. A comment that mentions `/oc` or `/opencode` is the prompt; the `review:opencode` label starts a run with OpenCode's default prompt, "Review this pull request". The agent checks the commenter's write access, reacts with 👀, checks out the PR branch and answers in the PR conversation, also for questions from an inline thread. It does not handle review bodies.

The workflow passes an OpenCode config with the Go provider, Serena MCP, denied file edits and two instruction files (`review/INSTRUCTIONS.md`, `reviewers/opencode/github.md`).

[Setup](SETUP.md) · [Security model](SECURITY.md)
