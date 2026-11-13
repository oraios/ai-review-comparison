# OpenCode

OpenCode is implemented as a CLI review harness in the common main-branch image. The official GitHub Action also exists; using a custom manual trigger lets this demo reuse the same PR snapshot, MCP tools, and publisher as other agents.

Locally, set the same credential/model as shell variables and run `npm run review:local -- --reviewer opencode --pr 123`. Add `--runtime native` for installed tools. The [local guide](../../docs/LOCAL_RUNS.md) covers setup; local results are files and are never published.

## Selected subscription route

The pinned CLI is `opencode-ai@1.19.5` (V1 configuration). This adapter uses an **OpenCode Go subscription member key**, not a copied Copilot OAuth session. Go issues API keys for subscription access; the credential's shape does not by itself mean PAYG funding.

1. Subscribe to Go in the OpenCode console and obtain your member key. Go Teams does not cover service accounts.
2. Disable **Extra Usage** in that workspace so quota exhaustion does not silently become credit-funded usage. The adapter cannot verify or enforce this console setting.
3. Run `gh secret set OPENCODE_GO_API_KEY` and paste the key at the prompt.
4. Choose an available model and set `gh variable set OPENCODE_MODEL --body 'opencode-go/YOUR_MODEL_ID'`.
5. Wait for the latest main image and dispatch `review-opencode.yml --ref main -f pr_number=123` using `gh workflow run`.

There is no default model or fallback provider. Both the main and small model use the configured Go ID. Account limits, policy, and availability still apply. [Go subscription](https://opencode.ai/docs/console/go/).

## Configuration and tools

[run.mjs](run.mjs) renders the common MCP template into OpenCode's local command-array format. A default-deny permission map enables only the three project tools and Serena `list_dir`. Sharing and automatic updates are disabled, and configuration/cache/data homes are disposable. Credentials stay in the agent process; the MCP launcher strips them.

Edit [instructions.md](instructions.md) for OpenCode-specific review guidance and [../../review/INSTRUCTIONS.md](../../review/INSTRUCTIONS.md) for shared policy. The generated prompt contains PR number, repository, and immutable commits. [V1 MCP configuration](https://opencode.ai/v1/docs/mcp-servers/), [permissions](https://opencode.ai/v1/docs/permissions/).

## Native GitHub Action and other providers

The [official Action](https://opencode.ai/v1/docs/github) supports `/oc` and `/opencode` comments, PR events, schedules, and manual dispatch. Its `prompt` input supplies custom instructions; `use_github_token: true` can use a caller token without the OpenCode App. The adapter here needs no App because a separate publisher handles GitHub writes.

OpenCode's GitHub Copilot provider documents device OAuth, while Copilot CLI documents a Copilot Requests PAT for automation. We have not established that those credentials are interchangeable. That route remains unverified, but it no longer excludes OpenCode as a whole. Do not copy a saved ChatGPT/Codex account session into public CI to bypass this distinction.

No authenticated OpenCode run is claimed. Its Windows binary could not start on this machine; the Linux image build and first authenticated dispatch are still required.
