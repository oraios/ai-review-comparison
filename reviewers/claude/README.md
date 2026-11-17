# Claude Code Action

**Account and model.** Sign in to Claude Code with a Pro or Max subscription and run `claude setup-token`. Put the token in `.env` and include `claude` in `DEMO_REVIEWERS`. The workflow selects Claude Sonnet 5.5 with `--model claude-sonnet-5-5 --effort medium`. The shorter `sonnet` alias follows the current Sonnet release. [Anthropic model configuration](https://code.claude.com/docs/en/model-config)

```dotenv
CLAUDE_CODE_OAUTH_TOKEN=your-subscription-token
```

**Trigger.** Mention `@claude` in a PR conversation comment, an inline review comment or a review body. The comment is the prompt, so the same trigger starts a review and asks a follow-up:

```text
@claude Review this PR.
@claude Which assumption does your finding depend on?
```

The demo posts the first comment for you. [Workflow](../../.github/workflows/review-claude.yml)

**How it runs.** The workflow uses the action's interactive mode (no `prompt` input), as in the [upstream setup](https://github.com/anthropics/claude-code-action/blob/main/docs/usage.md). The action checks the commenter's write access, checks out the PR head, gathers the PR context and answers in a tracking comment or in the inline thread. The job runs in the project image. `claude_args` adds Serena MCP, Bash for the project's checks, the inline-comment tool and a short reviewer prompt that points to [review/INSTRUCTIONS.md](../../review/INSTRUCTIONS.md). The job token can comment but not push.

**Local runs.** `npm run review:local -- --reviewer claude` still uses the fixture MCP pipeline with [prompt.md](prompt.md) and [run.mjs](run.mjs). [Local runs](../../docs/LOCAL_RUNS.md)
