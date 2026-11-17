# Subscription credentials and models

| Reviewer | Account credential in `.env` | Model setting | Subscription |
| --- | --- | --- | --- |
| [Claude Code](../reviewers/claude/README.md) | `CLAUDE_CODE_OAUTH_TOKEN` from `claude setup-token` | `claude-sonnet-5-5`, medium | Claude Pro or Max |
| [Copilot CLI](../reviewers/copilot/README.md) | `COPILOT_GITHUB_TOKEN`, fine-grained PAT with Copilot Requests | `claude-sonnet-5.5`, medium | PAT owner’s Copilot seat |
| [OpenCode](../reviewers/opencode/README.md) | `OPENCODE_GO_API_KEY` issued to a Go member | `opencode-go/kimi-k3`, model default | OpenCode Go with Extra Usage disabled |

Setup stores credentials as Actions secrets. Rerun it after rotating a credential in `.env`. The reviewer configurations pin the models for initial reviews and follow-ups. Subscription quotas, model access and optional overages depend on the account. [Copilot billing](https://docs.github.com/en/copilot/concepts/agent-capabilities/agent-powered-workflows-and-operations/copilot-cli-in-github-actions) · [OpenCode Go](https://opencode.ai/docs/console/go/)

GitHub uses the administrator credential for setup and job-scoped credentials for review and publication. [Setup permissions](SETUP.md#repository-access) · [Discarded routes](DISCARDED.md)
