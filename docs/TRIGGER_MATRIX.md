# Trigger a review on GitHub

| Reviewer | Initial label | Follow-up in a PR conversation | Manual workflow |
| --- | --- | --- | --- |
| Claude Code | `review:claude` | `/review claude QUESTION` | `review-claude.yml` |
| Copilot CLI | `review:copilot` | `/review copilot QUESTION` | `review-copilot.yml` |
| OpenCode | `review:opencode` | `/review opencode QUESTION` | `review-opencode.yml` |

## Initial review

`npm run demo-review-on-gh` creates and labels one PR per selected reviewer. On an existing eligible PR, a repository collaborator with write, maintain or admin access can apply the corresponding label. The authorizations apply equally to private and public repositories. Opening a PR starts the ordinary CI checks.

## Ask a follow-up

Post a new comment in the PR’s **Conversation** tab. Start at the beginning of the comment and name one reviewer.

```text
/review claude Recheck your previous finding against the latest commit. What evidence changed?
```

The question can span several lines, up to 4,000 characters. Omit it to request another review. Each comment starts a fresh agent session with the current snapshot, the maintainer’s question and the previous review from that provider when available. The answer appears in a new PR review with fresh evidence. These review workflows produce findings and answers. They do not push fixes.

The router listens for newly created conversation comments. Post a new comment after a new commit, when correcting a request or when retrying a failed run. A new push runs fixture CI. Commit-message tags, mentions and Git tags do not dispatch a reviewer. Inline diff replies, edited comments and vendor-specific mentions are outside this router. Only open same-repository demo PRs targeting `main` pass preflight.

## Manual dispatch

A maintainer can choose **Actions → Review / PROVIDER → Run workflow** or use GitHub CLI. Supply the PR number and leave the internal router fields empty. Select `main` for each reviewer.

```sh
gh workflow run review-copilot.yml --ref main -f pr_number=123
```

The reviewer uses a read-only GitHub token. A separate job validates the MCP evidence and confirms the PR still points to the reviewed commit before it posts. [Setup](SETUP.md) · [Security model](SECURITY.md)
