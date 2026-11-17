# GitHub Copilot CLI

**Account and model.** Use a Copilot seat with CLI access to Claude Sonnet 5.5. Create a personal fine-grained token with **Copilot Requests** permission, put it in `.env`, and include `copilot` in `DEMO_REVIEWERS`. The workflow selects Sonnet 5.5 with `--model claude-sonnet-5.5 --reasoning-effort medium`. To check model access, enter `/model` in an authenticated Copilot CLI session. [CLI authentication](https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/authenticate-copilot-cli) · [Copilot CLI flags](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference)

```dotenv
COPILOT_GITHUB_TOKEN=your-personal-copilot-token
```

**Trigger.** Start a PR conversation comment or an inline review comment with `/copilot`:

```text
/copilot Review this PR.
/copilot Recheck the latest commit and explain what changed.
```

The demo posts the first comment for you. `@copilot` is not used because GitHub routes it to its own cloud agent, which pushes commits. [Workflow](../../.github/workflows/review-copilot.yml)

**How it runs.** The workflow mirrors Claude Code Action's interactive mode. It accepts commands only from people with write access, reacts with 👀, checks out the PR head and runs Copilot CLI in the project image with Serena MCP. Copilot reads the PR and discussion with `gh`, may run the project's checks, and posts a summary plus inline findings. In an inline thread it replies in that thread. The job token can comment but not push, and `git push` is denied to the CLI.

**Not native Copilot code review.** GitHub's built-in reviewer (request `@copilot` as a reviewer) can now customize its environment with `copilot-code-review.yml` and use repository MCP settings. It does not answer replies, and running it inside the project image with Serena is unverified. [Copilot code review](https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/copilot-code-review)

**Local runs.** `npm run review:local -- --reviewer copilot` still uses the fixture MCP pipeline with [prompt.md](prompt.md) and [run.mjs](run.mjs). [Local runs](../../docs/LOCAL_RUNS.md) · [Actions billing](https://docs.github.com/en/copilot/concepts/agent-capabilities/agent-powered-workflows-and-operations/copilot-cli-in-github-actions)
