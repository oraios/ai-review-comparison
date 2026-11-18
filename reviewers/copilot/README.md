# GitHub Copilot CLI

**Account and model.** Use a Copilot seat with CLI access to Claude Sonnet 5.5. Create a personal fine-grained token with **Copilot Requests** permission, put it in `.env`, and include `copilot` in `DEMO_REVIEWERS`. The workflow selects Sonnet 5.5 with `--model claude-sonnet-5.5 --reasoning-effort medium`. To check model access, enter `/model` in an authenticated Copilot CLI session. [CLI authentication](https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/authenticate-copilot-cli) · [Copilot CLI flags](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference)

```dotenv
COPILOT_GITHUB_TOKEN=your-personal-copilot-token
```

**Trigger.** Start a PR conversation comment, an inline review comment or the text of a submitted review with `/copilot`:

```text
/copilot Review this PR.
/copilot Recheck the latest commit and explain what changed.
```

The demo posts the first comment for you. `@copilot` is not used because GitHub routes it to its own cloud agent, which pushes commits. [Workflow](../../.github/workflows/review-copilot.yml)

**How it runs.** The workflow mirrors Claude Code Action's interactive mode. It accepts commands only from people with write access, reacts with 👀, checks out the PR head and runs Copilot CLI in the project image with Serena MCP. Copilot reads the PR and discussion with `gh`, may run the project's checks, and posts a summary plus inline findings. In an inline thread it replies in that thread; a request in a review body is answered in the PR conversation. The job token can comment but not push, and `git push` is denied to the CLI.

**Not native Copilot code review.** GitHub's built-in reviewer (request `@copilot` as a reviewer) can now customize its environment with `copilot-code-review.yml` and use repository MCP settings. It does not answer replies, and running it inside the project image with Serena is unverified. [Copilot code review](https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/copilot-code-review)

**Deviations from the standard setup.** Copilot has no vendor-provided comment integration for the CLI. GitHub documents running Copilot CLI in Actions with a fixed prompt, and its own PR features are native code review and the `@copilot` cloud agent. This workflow is therefore custom and copies the behavior of Claude Code Action's interactive mode.

| Deviation | Why |
| --- | --- |
| `/copilot` command instead of `@copilot` | `@copilot` starts GitHub's cloud agent, which pushes commits. |
| Copilot CLI instead of native Copilot code review | Native review does not read replies, and running it in the project image with Serena is unverified. |
| The workflow checks write access, reacts with 👀 and checks out the PR head itself | The CLI has no GitHub integration that does this. |
| The prompt tells Copilot how to post (`gh pr comment`, review-comment API, thread replies) | The CLI only prints its answer; posting is up to the agent. |
| `--allow-all-tools` with `git push` denied, `contents: read` | Non-interactive runs need pre-approved tools; reviewers must not push. |
| The job-level `if:` filters on `author_association` | Comments from people outside the repository are skipped before a runner starts. |
| The job runs in the project image, with a git `safe.directory` step | The agent and Serena run in the project's environment; git needs the exception inside a job container. |

**Local runs.** `npm run review:local -- --reviewer copilot` still uses the fixture MCP pipeline with [prompt.md](prompt.md) and [run.mjs](run.mjs). [Local runs](../../docs/LOCAL_RUNS.md) · [Actions billing](https://docs.github.com/en/copilot/concepts/agent-capabilities/agent-powered-workflows-and-operations/copilot-cli-in-github-actions)
