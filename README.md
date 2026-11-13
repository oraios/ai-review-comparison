# AI review comparison

This repo demonstrates three ways to turn a coding agent into a reviewer: run it in your own image, orchestrate it with GitHub Agentic Workflows, or use a hosted Codex integration. The same shipping regression and review instructions make their differences visible. Native PR integration is optional: a PR number, immutable commit metadata, a prompt, and access to the code can start a review.

The comparison separates **agent**, **model subscription/provider**, **execution environment**, **tools**, and **publication**. Codex through github-aw using Copilot inference is a different setup from OpenAI-hosted Codex, GitHub's managed Codex agent, and Copilot CLI.

**Current status:** four custom-image adapters, a shared local runner, and a compiled github-aw comparator are implemented; hosted Codex paths have setup guides and a prompt helper. Local tests, prompt preparation, and real Serena/Chromium integration have run. Authenticated inference, the Linux image build, and hosted publication have **not** run. See [observed results](docs/RESULTS.md).

## How the demo fits together

1. **Controlled image runs:** Claude Code Action, Copilot CLI, OpenCode CLI, and OpenHands SDK run in this repo's main-branch Docker image. Each has an independent workflow triggered by a label or manual dispatch. Real MCP calls and tests produce evidence; a separate job validates and posts a PR review.
2. **github-aw comparator:** Codex runs in github-aw's managed sandbox using Copilot inference. Project and Serena MCP servers run in the same main-branch project image. A separate job validates and publishes a comparator PR review. This demonstrates custom tools without claiming the agent's sandbox image matches other runs.
3. **Hosted Codex:** OpenAI's GitHub review/cloud task experience and GitHub's Codex coding agent provide subscription-backed alternatives. The [hosted guide](reviewers/codex-hosted/README.md) explains setup, instructions, and capabilities that still need account-level verification.

The fixture charges $4.99 shipping below $50 and provides free shipping at $50. A demo PR changes `freeShippingMinCents` from `5000` to `500`. Reviewers should catch that orders from $5 to $49.99 incorrectly receive free shipping, reproduce it, and explain the smallest fix.

CI fixture workflows accept only a same-repository PR changing numeric `demo/pricing.json`. Code, prompts, MCP configuration, and tests come from trusted `main`. Local reviews reuse that fixture boundary with a chosen image or trusted working checkout. The hosted prompt helper can also describe other PRs.

```text
main → build/test → GHCR image → resolve and verify digest
                                           ↓
PR label or number → validate and snapshot → prompt → agent + MCP
                                           ↓
                               receipts + checks + findings
                                           ↓
                  image runs: validate → publish PR review
                  github-aw: validate → comparator PR review
```

| Location | Responsibility |
| --- | --- |
| `demo/` | Calculator, trusted pricing code, editable regression data |
| `review/INSTRUCTIONS.md` | Shared custom review priorities |
| `reviewers/NAME/` | Configuration, prompt, MCP template, adapter, setup notes |
| `mcp/` | Project tools and restricted adapter to real Serena |
| `scripts/` | PR preparation, prompts, image/evidence validation, publication |
| `Dockerfile`, `image/` | Common runtime and pinned dependencies |
| `.github/workflows/` | Image pipeline, fixture CI, independent reviews, github-aw source/lock |
| `docs/` | Authentication, triggers, security, sources, observed results |

## Start a labeled comparison

Once this implementation is committed and pushed to **remote `main`**, the normal sequence is: fill `.env`, run setup, then create the comparison PRs. You need Node 22+, `gh`, repository administrator access for setup, and access to the selected model subscriptions/providers. No local Docker daemon is needed for this hosted path.

```bash
# PowerShell also supports these commands; use Copy-Item instead of cp if preferred.
cp .env.template .env
# Edit .env: choose DEMO_REVIEWERS, paste their credentials, and set required model IDs.
npm run setup-ci-secrets
npm run demo-review-on-gh
```

[.env.template](.env.template) lists all inputs. Defaults select `claude,copilot,opencode,openhands,github-aw`; remove reviewers you cannot authenticate. The setup script starts `gh auth login` if needed, verifies remote main, enables the required workflows, creates all five labels, uploads only selected secrets/variables, and builds or waits for the current main image. Existing organization policies remain in force. GitHub login and provider login are separate; subscription signup, `claude setup-token`, and creation of personal/member keys remain account-owner steps explained below.

The demo script creates one branch and one PR per selected reviewer through GitHub's API, without switching branches or modifying your checkout. Every PR has the same small pricing regression and receives its provider label. It then waits for an actual review on each exact PR commit, prints review URLs, and saves a manifest under ignored `artifacts/`. Expected failing fixture CI demonstrates the bug; it does not prevent the review workflow from running. Auth failures, unavailable models, or missing evidence cause failure/timeout instead of a fabricated review.

Both scripts accept `--repo OWNER/REPO`, `--env PATH`, `--reviewers claude,copilot`, and `--dry-run`. Use `npm run demo-review-on-gh -- --no-wait` to return after labeling, or `--timeout-minutes 60` to extend the default 45-minute wait. A second demo invocation creates new PRs. To retry existing PRs, remove and reapply their label. Setup is idempotent and may be rerun after rotating credentials. `.env`, credentials, local tools, and generated evidence are ignored by Git; only the blank template is tracked.

The automated set is the five runnable workflows. Hosted OpenAI/GitHub Codex integrations require their own account setup and triggers; Cline/goose remain disabled prototypes. They are not silently counted as working labeled examples.

## Customize the review

Instructions express **what makes a useful review**; adapter settings control **how it runs**. Edit [review/INSTRUCTIONS.md](review/INSTRUCTIONS.md) for team-wide priorities, language, severity guidance, or required reproductions. Optional `reviewers/NAME/instructions.md` adds agent-specific guidance; [OpenCode's example](reviewers/opencode/instructions.md) shows this.

Image runs assemble the review contract, shared instructions, optional override, and repository/PR/head/base metadata into `prompt.txt`. Its hash is recorded in `environment.json`. The project MCP context returns these instructions and metadata too, so github-aw consumes the same policy. Land changes on main and wait for the new image before comparing runs.

For hosted Codex, merge [AGENTS.example.md](reviewers/codex-hosted/AGENTS.example.md) into your existing repository `AGENTS.md`, preserving existing engineering instructions, or paste the policy into the host's review prompt/preset. The generic prompt helper includes it explicitly rather than assuming every agent loads every vendor's instruction file.

### Add tools with MCP: Serena example

MCP gives agents named tools backed by a server. The **project** server supplies the requirement, runs real assertions and Chromium, and accepts structured findings. **Serena** is a separate, real MCP server pinned to a source commit. A small adapter exposes only its root `list_dir` tool over the isolated fixture, making consumption easy to audit.

Each image reviewer has this common template:

```json
{
  "mcpServers": {
    "project": { "command": "$NODE", "args": ["$LAUNCHER", "project", "$RUN_DIRECTORY"] },
    "serena": { "command": "$NODE", "args": ["$LAUNCHER", "serena", "$RUN_DIRECTORY"] }
  }
}
```

These are template tokens, not shell expansions. [prepare-run.mjs](scripts/prepare-run.mjs) resolves absolute paths. The launcher uses disposable homes and an environment allowlist; inference credentials do not reach Serena or Chromium. This local stdio Serena example needs no service secret.

Adapters translate the configuration into Claude's `--mcp-config`, Copilot's `--additional-mcp-config`, OpenCode's command-array `mcp` format, and OpenHands' `Agent(mcp_config=…)`. github-aw declares container MCP servers directly. For another trusted server, update its template, install prerequisites in the image, supply any required service credential explicitly, and allow only the intended tools. PR-provided server commands are not accepted.

Serena's fixed tool list, one-shot mode, and read-only project are configured in [mcp/](mcp/). Its REPL is not exposed. Semantic tools require matching language servers and a deliberate expansion of the fixture/adapter. [Serena configuration](https://oraios.github.io/serena/02-usage/050_configuration.html), [tool security](https://oraios.github.io/serena/02-usage/070_security.html).

## Prepare the runtime and authentication

Dependencies belong in the image or host setup; inference credentials belong in the selected provider's secret mechanism. GitHub repository access is separate: `gh auth login` does not authenticate a model provider.

### Build and publish the image

Land this implementation on main. [Publish review image](.github/workflows/build-image.yml) builds/tests the [Dockerfile](Dockerfile), then publishes `ghcr.io/oraios/ai-review-comparison/review-env:main` and `:sha-COMMIT`. It uses `GITHUB_TOKEN` with `packages: write`; no registry password secret is needed. Consumers have `packages: read`.

For private packages, grant this repository access under **Package settings → Manage Actions access**. Visibility is not changed automatically. [GHCR access](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry).

The image includes Node, Python, `gh`, pinned agent packages, Serena, OpenHands, Playwright/Chromium, the fixture, and MCP servers. Review workflows resolve `:main` to a digest and verify source/revision labels against the dispatched main commit. That digest becomes `jobs.review.container.image`. A stale or missing image blocks the review.

To customize the base environment, change the Dockerfile, publish from main, and rerun. Locally: `docker build --platform linux/amd64 -t review-env:local .`. Ordinary workflows derive image names from the repository; in a fork also change the literal MCP image name in `aw-codex.md` and recompile.

### Supply secrets and select models

Fill `.env` and run `npm run setup-ci-secrets` to establish the selected repository secrets and variables. Values go to `gh` through stdin, never command arguments or logs. Alternatively use **Settings → Secrets and variables → Actions** or `gh secret set NAME`, which prompts for the value. These examples use repository secrets; attach a protected environment to the relevant jobs if required by your organization.

| Path | Authentication / Actions secret | Non-secret setting | Billing |
| --- | --- | --- | --- |
| Claude Code Action | `CLAUDE_CODE_OAUTH_TOKEN` from `claude setup-token` | Model in `reviewers/claude/config.json` | Claude Pro/Max account |
| Copilot CLI | Fine-grained PAT with **Copilot Requests** → `COPILOT_GITHUB_TOKEN` | Model in `reviewers/copilot/config.json` | PAT owner's Copilot entitlement |
| OpenCode CLI | OpenCode Go member key → `OPENCODE_GO_API_KEY` | Variable `OPENCODE_MODEL=opencode-go/MODEL_ID` | Go subscription; disable Extra Usage |
| github-aw Codex | Same `COPILOT_GITHUB_TOKEN` route | `engine.model` in `aw-codex.md`, then compile | PAT owner's Copilot entitlement |
| OpenHands SDK | Provider API key → `LLM_API_KEY` | Variable `OPENHANDS_MODEL=PROVIDER/MODEL_ID` | Separate API account |
| OpenAI-hosted Codex | ChatGPT sign-in and GitHub connection | Hosted review/environment settings | Eligible ChatGPT plan and limits |
| GitHub-hosted Codex | GitHub sign-in, paid Copilot plan, agent policy | GitHub agent/model selection | Copilot plan and limits |

**Claude:** authenticate locally, run `claude setup-token`, then `gh secret set CLAUDE_CODE_OAUTH_TOKEN`. The Action uses OAuth and a separate read-only GitHub token; the Claude GitHub App is optional for this custom-token workflow. Installing an App alone does not enable mentions here. No Anthropic API-key fallback is configured. [Official setup](https://github.com/anthropics/claude-code-action/blob/main/docs/setup.md).

**Copilot / github-aw:** create the user-owned fine-grained PAT with Copilot Requests access, then `gh secret set COPILOT_GITHUB_TOKEN`. Confirm CLI/model access and organization policy. The alternative `GITHUB_TOKEN` plus `copilot-requests: write` is not selected: organization-owned repositories can incur organization-billed usage, rather than the triggering person's subscription. [Auth and billing](https://docs.github.com/en/copilot/concepts/agent-capabilities/agent-powered-workflows-and-operations/copilot-cli-in-github-actions), [github-aw Codex](https://github.github.io/gh-aw/reference/engines/codex/).

**OpenCode:** subscribe to Go, obtain a member key, disable **Extra Usage** in the console, then `gh secret set OPENCODE_GO_API_KEY`. Set `gh variable set OPENCODE_MODEL --body 'opencode-go/YOUR_MODEL_ID'` using a model available to your subscription. The adapter confines primary and small-model calls to Go; it cannot enforce the console billing switch. A subscription-issued API key is the transport here. Go Teams does not cover service accounts. [Go plans and limits](https://opencode.ai/docs/console/go/).

OpenCode also has an [official GitHub Action](https://opencode.ai/v1/docs/github) with mention, PR, manual, and schedule triggers. This demo invokes the pinned CLI to reuse the common prompt/MCP/evidence pipeline without an App. Its interactive Copilot OAuth route is distinct from Copilot CLI's PAT; credential interchangeability is unverified here. See [OpenCode setup](reviewers/opencode/README.md).

**OpenHands:** explicitly choose/fund a supported API provider, then `gh secret set LLM_API_KEY` and `gh variable set OPENHANDS_MODEL --body 'YOUR_PROVIDER/YOUR_MODEL_ID'`. There is no default paid model or assumed OSS grant. This runs the native SDK in the job container. [SDK MCP example](https://github.com/OpenHands/software-agent-sdk/blob/main/examples/01_standalone_sdk/07_mcp_integration.py).

The [auth matrix](docs/AUTH_MATRIX.md) covers quotas, rotation, and Cline/goose prototype gates. Hosted Codex needs no local `auth.json` uploaded to Actions. OpenAI's warning about saved ChatGPT-account authentication in public/OSS CI does not exclude its supported hosted subscription integrations. [Automation guidance](https://learn.chatgpt.com/docs/non-interactive-mode#authenticate-in-automation).

### Configure github-aw and hosted Codex

[aw-codex.md](.github/workflows/aw-codex.md) is the source; GitHub runs the generated [aw-codex.lock.yml](.github/workflows/aw-codex.lock.yml). Install [gh-aw v1.2.2](https://github.com/github/gh-aw/releases/tag/v1.2.2), use `gh aw compile aw-codex` after edits, and commit both files.

The example uses setup steps and sibling MCP containers on the runner's Docker daemon. Docker-in-Docker is unnecessary. Current github-aw also supports `sandbox.agent.images`, but that requires an AWF-compatible manifest covering the required roles, not an arbitrary project Dockerfile dropped in. [Our github-aw guide](reviewers/github-aw/README.md), [sandbox reference](https://github.github.io/gh-aw/reference/sandbox/).

For hosted alternatives, follow [Codex setup](reviewers/codex-hosted/README.md). OpenAI's reusable cloud task environments and legacy GitHub review integration have different setup surfaces. GitHub's Codex agent is also distinct from native Copilot Code Review. Record tool availability separately for each.

## Run a comparison

Use one label per PR to compare reviewers on identical diffs. Manual dispatch remains available for retries or multiple reviewers on one PR; hosted UI/mentions demonstrate those products separately.

### Labels and repository setup

`setup-ci-secrets` establishes the labels automatically. The equivalent standalone commands are:

```bash
gh label create 'review:claude' --color D97757 --description 'Run Claude review' --force
gh label create 'review:copilot' --color 8250DF --description 'Run Copilot review' --force
gh label create 'review:opencode' --color 24292F --description 'Run OpenCode review' --force
gh label create 'review:openhands' --color 1F883D --description 'Run OpenHands review' --force
gh label create 'review:github-aw' --color 0969DA --description 'Run github-aw Codex review' --force

gh pr edit 123 --add-label 'review:claude'
# Retry after a fix, credential rotation, or new commit:
gh pr edit 123 --remove-label 'review:claude'
gh pr edit 123 --add-label 'review:claude'
```

Use your personal `gh` login to apply labels. The router listens only to `labeled`, verifies repository write access and a same-repository PR targeting main, and dispatches the mapped workflow on main. It does not check out PR code or receive model credentials. The receiving workflow rechecks the router identity, actor permissions, current label, and numeric fixture boundary. A label left on a PR does not automatically review later pushes; reapply it or dispatch manually. GitHub permits `GITHUB_TOKEN` to trigger `workflow_dispatch`; labels applied directly by that workflow token do **not** trigger this router. [GitHub event behavior](https://docs.github.com/en/actions/concepts/security/github_token).

### Create the regression PR

For all selected providers, use `npm run demo-review-on-gh`. To create a single PR manually after setup has landed on main:

```bash
git switch main
git pull --ff-only
git switch -c demo/shipping-regression
node scripts/regression.mjs
git add demo/pricing.json
git commit -m "Demo: lower the free-shipping threshold"
git push -u origin demo/shipping-regression
gh pr create --title "Demo: shipping threshold regression" --body "Controlled fixture. Expected free-shipping threshold remains 50 dollars."
```

Only this JSON file should change. Fixture CI should be red because it detects the regression. Return to main before editing instructions or workflows.

### Select a workflow

Replace `123` with the PR number and run only the configured reviewers:

```bash
gh workflow run review-claude.yml --ref main -f pr_number=123
gh workflow run review-copilot.yml --ref main -f pr_number=123
gh workflow run review-opencode.yml --ref main -f pr_number=123
gh workflow run review-openhands.yml --ref main -f pr_number=123
gh workflow run aw-codex.lock.yml --ref main -f pr_number=123
```

For a generic hosted task, use your existing `gh` login:

```bash
node scripts/hosted-prompt.mjs oraios/ai-review-comparison 123
```

This makes read-only requests and writes `artifacts/hosted-review-prompt.txt`. Paste it into OpenAI Cloud or GitHub's Codex agent. It includes shared instructions, PR/repository/head/base metadata, and `gh pr view`/`gh pr diff` commands. It sends no prompt or comment. For OpenAI's native GitHub review, connect the repo and comment `@codex review` instead; automatic-review setup is in the hosted guide.

| When | Mechanism enabled here | Output |
| --- | --- | --- |
| Main environment/code changes | Main push or manual `build-image.yml` | Tested image in GHCR |
| PR changes | Opened/synchronize/reopened/ready-for-review `ci.yml` | Credential-free checks |
| Selected fixture PR | Provider label or manual `review-*.yml` | Validated COMMENT review and artifacts |
| github-aw comparison | `review:github-aw` or manual `aw-codex.lock.yml` | Comparator COMMENT review and evidence |
| Hosted subscription experience | Host UI / supported mention after account setup | Host-native output |
| More automatic/comment/schedule routes | Extend event routing and preflight deliberately | Not enabled by adding an event alone |

See [trigger details](docs/TRIGGER_MATRIX.md). Credentialed fixture preflight requires write/maintain/admin access, checks both actor identities on reruns, and rejects forks. Ordinary PR CI is credential-free.

### Read the result

Use `gh run list`, `gh run view RUN_ID`, and `gh run download RUN_ID`. Image runs produce `NAME-input-RUN-ATTEMPT`, `NAME-evidence-RUN-ATTEMPT`, and `NAME-publication-RUN-ATTEMPT` artifacts. Inspect the SHA, model/version, prompt hash, digest, MCP receipts, actual checks, screenshot, finding, and publication URL.

`READY_TO_PUBLISH` means image/tool evidence passed validation. `PASS` additionally requires a GitHub review receipt for the unchanged PR head. `BLOCKED` means a requirement failed. github-aw progresses from `COMPARATOR_EVIDENCE_VERIFIED` to `COMPARATOR_REVIEW_PUBLISHED` after receiving its review receipt; neither status claims a custom agent image. `LOCAL_PROTOCOL_VERIFIED` is scripted integration evidence, never an AI review success.

Judge finding quality separately: receipts prove tool-response consumption, not sound reasoning. github-aw retains framework-managed logs/artifacts in addition to our scoped evidence; its logging differs from ordinary image runs. See [security boundaries](docs/SECURITY.md).

## Run reviews locally

The local runner reuses the same PR snapshot, custom instructions, review adapters, MCP tools, and evidence validation. Use Docker for the closest environment match, or native tools for quick iteration. It writes a local report and never posts to GitHub.

With `gh auth login`, a running Linux Docker engine, and the chosen provider credential in your shell:

```bash
npm run review:local -- --reviewer copilot --pr 123
npm run review:local -- --reviewer claude --pr 123 --repo oraios/ai-review-comparison
```

`--reviewer` also accepts `opencode` and `openhands`. The default image is this repository's published main image; use `--image review-env:local` after a local Docker build. Local credentials use the same names as Actions secrets, but are supplied as environment variables. Actions secrets are not fetched automatically.

To inspect a prompt without inference, or run installed tools on Linux/macOS/WSL:

```bash
npm run review:local -- --reviewer copilot --pr 123 --runtime native --prepare-only
npm run review:local -- --reviewer copilot --pr 123 --runtime native
```

Without a PR, replace `--pr 123` with `--fixture regression` or `--fixture healthy`. A verified local model run produces `report.md` and `LOCAL_REVIEW_VERIFIED` under a fresh `artifacts/local-reviews/` directory. This is separate from hosted PASS/publication.

The [local execution guide](docs/LOCAL_RUNS.md) covers prerequisites, Bash/PowerShell credentials, private GHCR pulls, native Serena/OpenHands installation, and fidelity differences. It also explains local Codex prompts and github-aw compilation/dispatch previews: the pinned github-aw CLI does not execute its workflow locally.

## Local checks and troubleshooting

```bash
npm ci --ignore-scripts
npx --no-install playwright install chromium
npm test
npm run check:workflows
npm run check
npm run smoke
npm start
```

Open [the calculator](http://127.0.0.1:3000). For real Serena integration:

```bash
uv venv .venv-serena --python 3.13
uv pip install --python .venv-serena/bin/python 'git+https://github.com/oraios/serena@6e5c3776d4e67befaab7c290bc29b0279c98d1ed'
npm run demo:local -- .venv-serena/bin/serena
```

On Windows use `.venv-serena/Scripts/python.exe` and `.venv-serena/Scripts/serena.exe`. The test launches real MCP and Chromium, reproduces the regression, and submits a labeled scripted finding. It performs no inference or publication.

| Symptom | Check |
| --- | --- |
| Missing workflow/image | Default-branch files, Actions enablement, latest main build |
| GHCR denied or stale image | Package Actions access, read permission, dispatched source revision |
| Auth/quota/model error | Secret name, expiry, entitlement, model catalog, organization policy |
| Missing MCP/browser evidence | Image build, server startup, actual tool calls |
| Rejected PR | Same repo, open, base main, exactly one modified numeric JSON file |
| Publication blocked | Moving PR head, Actions PR-write policy, incomplete evidence |
| github-aw edited | Recompile with v1.2.2 and commit the lock |
| Local runner fails | Check [local prerequisites and credentials](docs/LOCAL_RUNS.md); `--prepare-only` skips inference |

Detailed records: [results](docs/RESULTS.md), [auth](docs/AUTH_MATRIX.md), [sources](docs/SOURCES.md), [third-party notices](docs/THIRD_PARTY_NOTICES.md). No authenticated hosted success has been recorded yet.

## Comparison at a glance

| Option | Funding/auth | Agent environment | Custom tools/environment | Hosted trigger → output | Local path | Readiness |
| --- | --- | --- | --- | --- | --- | --- |
| **Claude Code Action** | Claude Pro/Max OAuth | Main GHCR image | Project + Serena MCP; image control | `review:claude` / manual → PR review | Same CLI/settings in Docker or native | Implemented; inference pending |
| **Copilot CLI** | Copilot seat / personal PAT | Main GHCR image | Project + Serena MCP; image control | `review:copilot` / manual → PR review | Same adapter in Docker or native | Implemented; inference pending |
| **OpenCode CLI** | OpenCode Go subscription key | Main GHCR image | Project + Serena MCP; image control | `review:opencode` / manual → PR review; native Action exists | Same adapter in Docker or native | Implemented; inference pending |
| **OpenHands SDK** | Explicit provider API billing | Main GHCR image | Native SDK MCP; image control | `review:openhands` / manual → PR review | Same adapter in Docker or native | Implemented; inference pending |
| **Codex via github-aw** | Copilot subscription / PAT | AWF managed sandbox | Our image for MCP; AWF manifest customization | `review:github-aw` / manual → comparator PR review | Compile/preview; Codex CLI task is a different route | Compiled; hosted run pending |
| **Codex on OpenAI** | Eligible ChatGPT subscription | OpenAI Cloud | Instructions, prepared task environments; review MCP parity unverified | Mention, auto-review, or cloud task | Shared prompt in local Codex | Guided comparison |
| **Codex on GitHub** | Paid Copilot subscription | GitHub-managed agent | Instructions; partner MCP/setup unverified | Agents UI / supported PR mention | Shared prompt; local funding/environment differ | Guided comparison |
| **Cline / goose ACP** | Proposed ChatGPT / Claude routes | Proposed custom image | MCP prototypes | Disabled | No automated adapter | Subscription CI / ACP validation gated |
