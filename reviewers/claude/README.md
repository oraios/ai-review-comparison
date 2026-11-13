# Claude Code Action

Implemented manual workflow: [review-claude.yml](../../.github/workflows/review-claude.yml). Acceptance is **BLOCKED until an authenticated hosted run publishes a review**.

For a local report, set `CLAUDE_CODE_OAUTH_TOKEN` in your shell and run `npm run review:local -- --reviewer claude --pr 123`. Docker is the default; `--runtime native` uses installed tools. The [local guide](../../docs/LOCAL_RUNS.md) explains setup. Local [run.mjs](run.mjs) invokes the CLI with the Action's review settings, without the Action wrapper or GitHub publisher.

Use Claude Pro/Max and `claude setup-token`, then `gh secret set CLAUDE_CODE_OAUTH_TOKEN`. The official Action receives `claude_code_oauth_token` and the job's read-only `github.token`. This explicit GitHub-token arrangement does not require the Claude App; native mention integrations may use [the App](https://github.com/apps/claude). [Official setup](https://github.com/anthropics/claude-code-action/blob/main/docs/setup.md).

`config.json` selects the `sonnet` model alias and subscription auth. The action and CLI are pinned separately. Edit `prompt.md` for review instructions, `mcp.template.json` for project/Serena launch configuration, and run `node scripts/generate-workflows.mjs` after model/workflow changes. The workflow disables built-in tools and auto permission decisions and allows only the four demo MCP tools. A separate job posts a COMMENT review.

After the main image build and same-repository pricing-only PR exist:

```bash
gh workflow run review-claude.yml --ref main -f pr_number=123
```

Artifacts: `claude-input-RUN-ATTEMPT`, `claude-evidence-RUN-ATTEMPT`, `claude-publication-RUN-ATTEMPT`. A 401/expired token/limit failure remains BLOCKED; API auth is never attempted. See [root setup](../../README.md), [auth matrix](../../docs/AUTH_MATRIX.md), [trigger matrix](../../docs/TRIGGER_MATRIX.md).
