# Claude Code Action

**Account and model.** Sign in to Claude Code with a Pro or Max subscription and run `claude setup-token`. Put the token in `.env` and include `claude` in `DEMO_REVIEWERS`. The workflow selects Claude Sonnet 5.5 with `--model claude-sonnet-5-5 --effort medium`. The shorter `sonnet` alias follows the current Sonnet release. [Anthropic model configuration](https://code.claude.com/docs/en/model-config)

```dotenv
CLAUDE_CODE_OAUTH_TOKEN=your-subscription-token
```

**Initial review.** Run the [two demo commands](../../docs/SETUP.md). The demo applies `review:claude`. A maintainer can apply that label to an eligible existing PR, or dispatch `review-claude.yml` on `main` with `pr_number`. The Action launches Claude inside the pinned project image with the project and Serena MCP servers. A separate job publishes its review.

**Follow-up.** Post a new conversation comment such as `/review claude Which assumption does your finding depend on?`. A new session sees the current head, question and previous Claude review when available. After pushing commits, post the command again or reapply the label. Commit-message tags, inline replies and native `@claude` mentions do not trigger this configured workflow. [Trigger reference](../../docs/TRIGGER_MATRIX.md)
