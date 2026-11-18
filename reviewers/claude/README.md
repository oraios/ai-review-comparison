# Claude Code Action

**Account and model.** Sign in to Claude Code with a Pro or Max subscription and run `claude setup-token`. Put the token in `.env` and include `claude` in `DEMO_REVIEWERS`. The workflow selects Claude Sonnet 5.5 with `--model claude-sonnet-5-5 --effort medium`. The shorter `sonnet` alias follows the current Sonnet release. [Anthropic model configuration](https://code.claude.com/docs/en/model-config)

```dotenv
CLAUDE_CODE_OAUTH_TOKEN=your-subscription-token
```

**Trigger.** Write `/claude` in a PR conversation comment, an inline review comment or the text of a submitted review. The action's default `@claude` is replaced with `/claude` (`trigger_phrase`) so comments do not mention a GitHub user. The comment is the prompt, so the same trigger starts a review and asks a follow-up:

```text
/claude Review this PR.
/claude Which assumption does your finding depend on?
```

The demo posts the first comment for you. [Workflow](../../.github/workflows/review-claude.yml)

**How it runs.** The workflow uses the action's interactive mode (no `prompt` input), as in the [upstream setup](https://github.com/anthropics/claude-code-action/blob/main/docs/usage.md). The action checks the commenter's write access, checks out the PR head, gathers the PR context and answers in a tracking comment or in the inline thread. The job runs in the project image. `claude_args` adds Serena MCP, Bash for the project's checks, the inline-comment tool and a short reviewer prompt that points to [review/INSTRUCTIONS.md](../../review/INSTRUCTIONS.md). The job token can comment but not push.

**Deviations from the standard setup.** The baseline is the upstream example workflow (`examples/claude.yml` in claude-code-action): the action on comment events, no `prompt`, `@claude` as trigger.

| Deviation | Why |
| --- | --- |
| `trigger_phrase: /claude` instead of `@claude` | `@claude` mentions a GitHub user of that name; all three reviewers use slash commands. |
| The job runs in the project image (`container:`), with the image's `claude` and `bun` executables | The demo's premise: the agent and Serena run in the project's environment. |
| A step marks the checkout as a git `safe.directory` | In a job container the workspace belongs to another user, and the action's `git fetch` fails without it. |
| `claude_args` add Serena (`--mcp-config`), `Bash`, the inline-comment tool and a short reviewer prompt | Interactive mode allows only read tools and comment updates by default; reviews need Serena, the project's checks and line comments. |
| `github_token: github.token` | Avoids installing the Claude GitHub App; comments come from `github-actions[bot]`. |
| `contents: read` | Reviewers answer and comment; they never push. |
| The job-level `if:` also filters on `author_association` | Comments from people outside the repository are skipped before a runner starts. The action's own write-access check remains. |
| No automatic review when a PR opens | Reviews are requested explicitly, like for the other reviewers. |

**Local runs.** `npm run review:local -- --reviewer claude` still uses the fixture MCP pipeline with [prompt.md](prompt.md) and [run.mjs](run.mjs). [Local runs](../../docs/LOCAL_RUNS.md)
