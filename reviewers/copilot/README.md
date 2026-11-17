# GitHub Copilot CLI

**Account and model.** Use a Copilot seat with CLI access to Claude Sonnet 5.5. Create a personal fine-grained token with **Copilot Requests** permission, put it in `.env`, and include `copilot` in `DEMO_REVIEWERS`. The workflow selects Sonnet 5.5 with `--model claude-sonnet-5.5 --reasoning-effort medium`. To check model access, enter `/model` in an authenticated Copilot CLI session. [CLI authentication](https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/authenticate-copilot-cli) · [Copilot CLI flags](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference)

```dotenv
COPILOT_GITHUB_TOKEN=your-personal-copilot-token
```

**Initial review.** Run the [two demo commands](../../docs/SETUP.md). The demo applies `review:copilot`. A maintainer can apply that label to an eligible existing PR. The CLI starts inside the project image, receives the chosen ID through `--model` and uses the project and Serena MCP servers. The Actions run title and published review identify the model.

**Manual dispatch.** In **Actions → Review / copilot → Run workflow**, select `main` and supply the PR number, or use GitHub CLI.

```sh
gh workflow run review-copilot.yml --ref main -f pr_number=123
```

**Follow-up.** Post `/review copilot Recheck the latest commit and explain what changed.` as a new top-level PR comment. After another push, submit a new comment or reapply the label. Commit-message tags and `@copilot` mentions do not dispatch this CLI workflow. GitHub’s managed coding agent has separate triggers. [Trigger reference](../../docs/TRIGGER_MATRIX.md) · [Actions billing](https://docs.github.com/en/copilot/concepts/agent-capabilities/agent-powered-workflows-and-operations/copilot-cli-in-github-actions)
