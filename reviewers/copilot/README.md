# GitHub Copilot CLI

Implemented manual workflow: [review-copilot.yml](../../.github/workflows/review-copilot.yml). Acceptance is **BLOCKED until an authenticated hosted run publishes a review**.

The same adapter also runs locally: set `COPILOT_GITHUB_TOKEN` in your shell, then `npm run review:local -- --reviewer copilot --pr 123`. Add `--runtime native` for installed tools instead of Docker. See [local setup](../../docs/LOCAL_RUNS.md); local runs write files and do not publish.

Provision a user-owned fine-grained PAT with **Copilot Requests** and an active seat; store it with `gh secret set COPILOT_GITHUB_TOKEN`. This is inference auth, separate from `gh auth login` and the job tokens used for PR operations. No App installation is required. [Official CLI auth](https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/authenticate-copilot-cli).

`config.json` selects the model and account-billed route. `run.mjs` invokes the pinned CLI with additional local MCP configuration and explicit tools, denies shell/file/network capabilities, disables built-in MCPs and uses an isolated account directory. `prepare-run.mjs` renders this candidate's `mcp.template.json` into Copilot's local-server schema. No API-provider config or cached user credential is imported.

```bash
gh workflow run review-copilot.yml --ref main -f pr_number=123
```

Artifacts: `copilot-input-RUN-ATTEMPT`, `copilot-evidence-RUN-ATTEMPT`, `copilot-publication-RUN-ATTEMPT`. PR routing and posting are custom glue. The PAT owner's seat/credits apply; `GITHUB_TOKEN` inference in an organization would instead meter the organization, and is not enabled here. [Billing](https://docs.github.com/en/copilot/concepts/agent-capabilities/agent-powered-workflows-and-operations/copilot-cli-in-github-actions). See [root setup](../../README.md).
