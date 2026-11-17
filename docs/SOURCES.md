# Documentation record

Checked on 13 November 2026. Context7 CLI was used to resolve and fetch current Claude Code Action, GitHub Copilot CLI, OpenHands SDK, MCP TypeScript SDK, Playwright and Serena documentation. Primary upstream pages/source were also inspected for exact flags, auth limitations and implementation details. Source documentation may advance independently of the pinned image.

| Topic | Primary source |
| --- | --- |
| GitHub job containers | https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/run-jobs-in-a-container |
| GHCR build/auth/access | https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry |
| Claude OAuth/App/token setup | https://github.com/anthropics/claude-code-action/blob/main/docs/setup.md |
| Pinned Claude Action inputs | https://github.com/anthropics/claude-code-action/blob/4d75e5f390ee76b2e09c1980ecc99ff3a2e088c8/action.yml |
| Claude MCP configuration | https://github.com/anthropics/claude-code-action/blob/main/docs/configuration.md |
| Claude triggers | https://github.com/anthropics/claude-code-action/blob/main/docs/migration-guide.md |
| Copilot auth/billing in CI | https://docs.github.com/en/copilot/concepts/agent-capabilities/agent-powered-workflows-and-operations/copilot-cli-in-github-actions |
| Copilot GITHUB_TOKEN mode | https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli-in-actions |
| Copilot personal authentication | https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/authenticate-copilot-cli |
| Copilot flags/MCP/tool permissions | https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference |
| OpenCode providers | https://opencode.ai/docs/providers |
| OpenCode V1 GitHub integration | https://opencode.ai/v1/docs/github |
| OpenCode auth commands | https://opencode.ai/docs/cli/commands/ |
| Cline CLI subscription/MCP | https://github.com/cline/cline/blob/main/apps/cli/README.md |
| Cline API-key PR recipe | https://github.com/cline/cline/blob/main/docs/cli/samples/github-pr-review.mdx |
| goose ACP | https://github.com/aaif-goose/goose/blob/main/documentation/docs/guides/acp-providers.md |
| goose CI API recipe | https://github.com/aaif-goose/goose/blob/main/documentation/docs/tutorials/cicd.md |
| OpenHands PR modes | https://github.com/OpenHands/docs/blob/main/openhands/usage/use-cases/code-review.mdx |
| OpenHands SDK MCP example | https://github.com/OpenHands/software-agent-sdk/blob/main/examples/01_standalone_sdk/07_mcp_integration.py |
| Codex public-OSS account-auth warning | https://learn.chatgpt.com/docs/non-interactive-mode#authenticate-in-automation |
| Serena CLI source (pinned) | https://github.com/oraios/serena/blob/6e5c3776d4e67befaab7c290bc29b0279c98d1ed/src/serena/cli.py |
| Serena configuration | https://oraios.github.io/serena/02-usage/050_configuration.html |
| Serena security and tool vs REPL interface | https://oraios.github.io/serena/02-usage/070_security.html |
| Playwright image/version matching | https://playwright.dev/docs/docker |
| MCP SDK | https://github.com/modelcontextprotocol/typescript-sdk |

## Expanded comparison

The scope now includes hosted and setup-based comparators, even without a replaceable agent image. Environment and MCP parity are tracked separately from review usefulness.

| Topic | Primary source |
| --- | --- |
| OpenCode Go subscription keys, limits, Extra Usage | https://opencode.ai/docs/console/go/ |
| Pinned OpenCode V1 configuration | https://opencode.ai/v1/docs/config/ |
| OpenCode permission controls | https://opencode.ai/v1/docs/permissions/ |
| github-aw Codex with Copilot inference | https://github.github.io/gh-aw/reference/engines/codex/ |
| github-aw custom agent images and roles | https://github.github.io/gh-aw/reference/sandbox/ |
| github-aw custom setup/post steps | https://github.github.io/gh-aw/reference/steps-jobs/ |
| github-aw MCP containers | https://github.github.io/gh-aw/guides/mcps/ |
| Exact compiler release used | https://github.com/github/gh-aw/releases/tag/v1.2.2 |
| Local github-aw validation versus hosted execution | https://github.com/github/gh-aw/blob/v1.2.2/docs/adr/66270-local-first-workflow-debugging-compile-modes.md |
| GitHub CLI authenticated API requests | https://cli.github.com/manual/gh_api |
| Claude subscription tokens for scripts | https://code.claude.com/docs/en/authentication |
| Codex local stdin/noninteractive execution | https://learn.chatgpt.com/docs/non-interactive-mode |
| OpenAI Codex GitHub review | https://learn.chatgpt.com/docs/third-party/github |
| Base image and setup options for hosted Codex GitHub reviews | https://learn.chatgpt.com/docs/environments/cloud-environment#default-universal-image |
| OpenAI Support on running nested containers | https://community.openai.com/t/codex-docker-in-docker-in-environment-setup/1272369/22 |
| OpenAI cloud tasks vs legacy review environment | https://learn.chatgpt.com/docs/environments/cloud-environments |
| GitHub's subscription-backed Codex agent | https://docs.github.com/en/copilot/concepts/agent-capabilities/about-agents/about-third-party-coding-agents |

The OpenHands evaluation covered its native SDK. CodeRabbit, Greptile, Qodo, cubic and Sourcery were outside this comparison. The [discarded routes](DISCARDED.md) record the decisions for OpenHands, Cline, goose and the Codex integrations.
