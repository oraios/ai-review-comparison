# Run reviews locally

Local execution reuses the demo's PR snapshot, custom instructions, MCP servers, pricing/browser checks, and structured review validation. It is useful for trying an agent or changing a prompt before a hosted run. The default local path uses the same Docker image; a native path runs installed tools on your machine.

Local runs use the fixture pipeline (project MCP tools, receipts, evidence validation) for all three reviewers, including Claude and Copilot, whose GitHub workflows now run their agents directly on the PR. Local runs produce files and **never publish to GitHub**. They do not emulate Actions jobs, approvals, secrets, or hosted publication. GitHub CLI supplies repository access only; the selected agent still needs its own inference credential.

## Choose a local path

| Path | What is reused | What differs |
| --- | --- | --- |
| Docker runner — closest match | Main image or local build, agent packages, prompt, MCP, checks, receipts | Your Docker daemon and environment credentials; no Actions jobs or publisher |
| Native runner — fastest prompt iteration | Checkout's scripts/policy, same adapters and MCP contract | Your installed runtimes/browser/Serena; no image proof |
| Scripted protocol demo | Real MCP + Serena + browser checks | No model or provider authentication |
| Local Codex prompt | PR metadata and shared instructions | Your Codex CLI/session; no github-aw sandbox, Copilot inference route, or receipt guarantee |
| github-aw compile/dispatch preview | Markdown source and generated lock | Validation/preview only; the pinned CLI runs actual workflows on GitHub |

The automated local runner supports **Claude, Copilot and OpenCode**. Claude invokes the CLI with the Action's model/MCP/tool settings; the other two invoke the same adapter files as CI. Cline/goose remain disabled prototypes.

## Common setup: PR and authentication

Run from a trusted clone with Node 22+, Git, and GitHub CLI:

```bash
npm ci --ignore-scripts
gh auth login
gh auth status
gh pr list --repo oraios/ai-review-comparison
```

Choose an existing PR number. The runner infers `OWNER/REPO` from `gh repo view` unless you pass `--repo`. It uses the existing `gh` authentication to make read-only GitHub.com API requests; it does not export your GitHub token to the agent. [gh api](https://cli.github.com/manual/gh_api).

The same fixture restrictions as CI apply: open, same repository, base main, exactly one modified `demo/pricing.json`, and numeric content only. The head/base are captured immutably and rechecked during preparation. Local read-only reviews need repository read access, not CI's maintainer dispatch permission. No PR code is checked out or executed.

### Provide local credentials

Set the selected reviewer’s subscription credential in the shell that launches the runner. Local reviews use the same model and effort as GitHub Actions.

| Reviewer | Local environment variable | Model setting |
| --- | --- | --- |
| `claude` | `CLAUDE_CODE_OAUTH_TOKEN` from `claude setup-token` | Claude Sonnet 5.5, medium |
| `copilot` | `COPILOT_GITHUB_TOKEN`, personal PAT with Copilot Requests access | Claude Sonnet 5.5, medium |
| `opencode` | `OPENCODE_GO_API_KEY`, Go subscription member key | Kimi K3, model default |

Use your secret manager or read a value without storing it in shell history. For example, in Bash:

```bash
read -r -s -p 'Copilot token: ' COPILOT_GITHUB_TOKEN
export COPILOT_GITHUB_TOKEN
```

In PowerShell:

```powershell
$env:COPILOT_GITHUB_TOKEN = [System.Net.NetworkCredential]::new('', (Read-Host 'Copilot token' -AsSecureString)).Password
```

Use the corresponding variable name for another reviewer. OpenCode still requires disabling **Extra Usage** in the Go console; the script cannot enforce that billing setting. The selected subscription and its quotas apply. See the [authentication matrix](AUTH_MATRIX.md).

### Prepare without inference

You can inspect the prompt, PR snapshot, and MCP configuration before supplying any inference credential:

```bash
npm run review:local -- --reviewer copilot --pr 123 --runtime native --prepare-only
```

This writes a fresh directory under `artifacts/local-reviews/` and reports `LOCAL_PREPARED`. It does not check agent/Serena availability or execute any model or MCP tool. `--prepare-only` also works with Docker, which still needs the selected image and daemon.

## Docker execution

Use a local Linux Docker engine, or Docker Desktop in Linux-container mode on Windows/macOS. This demo targets `linux/amd64`; ARM hosts need emulation. Check `docker info` before running.

### Use the main-branch image

After the image pipeline has published the latest implementation:

```bash
npm run review:local -- --reviewer copilot --pr 123
npm run review:local -- --reviewer claude --pr 123 --repo oraios/ai-review-comparison
```

The default is `ghcr.io/OWNER/REPO/review-env:main`. The runner pulls that reference, checks the project marker and Linux/amd64 platform, inspects its content ID, then runs by that immutable local ID. It records the registry digest(s), baked source revision, prompt hash, and actual agent version. It does not require the image source to equal your checkout's HEAD; CI retains that stricter gate.

If GHCR is private, authenticate the Docker client with a credential that has package read access. An eligible `gh` credential can be piped to Docker without putting its value in an argument:

```bash
gh auth token | docker login ghcr.io --username YOUR_GITHUB_LOGIN --password-stdin
```

This command also works in PowerShell. Repository access alone does not guarantee package access; grant the appropriate package permissions/scopes. Public images need no registry login. [GHCR authentication](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry).

### Use a local build or a specific digest

For changes that have not reached main:

```bash
docker build --platform linux/amd64 -t review-env:local .
npm run review:local -- --reviewer copilot --pr 123 --image review-env:local
```

Or pass a published `ghcr.io/OWNER/REPO/review-env@sha256:...` reference. The image must contain this version of the local runner. An older published image may need rebuilding before these commands work.

Only the run directory is mounted. The container receives the selected subscription credential. Reviewer settings, instructions and MCP code come from **inside the image**. Rebuild to test edits to them, or use native mode.

## Native execution

Use Linux, macOS, or WSL for the agent processes. Windows supports Docker execution, prompt preparation, and the scripted protocol demo; native inference is explicitly blocked because the pinned Claude/OpenCode Windows binaries did not launch on this host.

Install the same pinned Node agents and add them to PATH:

```bash
npm ci --prefix image/agents
export PATH="$PWD/image/agents/node_modules/.bin:$PATH"
npx --no-install playwright install chromium
uv venv .venv-serena --python 3.13
uv pip install --python .venv-serena/bin/python 'git+https://github.com/oraios/serena@6e5c3776d4e67befaab7c290bc29b0279c98d1ed'
```

On Linux, Playwright may need system libraries: use `npx --no-install playwright install --with-deps chromium` with the required package-install privileges.

Then run the selected reviewer with the shell credentials above:

```bash
npm run review:local -- --reviewer claude --pr 123 --runtime native
npm run review:local -- --reviewer copilot --pr 123 --runtime native
npm run review:local -- --reviewer opencode --pr 123 --runtime native
```

The native Serena path defaults to `.venv-serena/bin/serena`. Override it with `--serena /absolute/path/to/serena`. The active checkout supplies code/instructions, including local edits; its revision and dirty state are recorded. Treat that checkout as trusted.

The runner uses disposable agent homes and explicit credentials rather than your normal CLI account configuration. MCP subprocesses receive an environment allowlist. A saved CLI login alone therefore does not satisfy these three adapters. Claude's `setup-token` is designed for scripts; `--bare` is not selected because it does not read that OAuth variable. [Claude authentication](https://code.claude.com/docs/en/authentication), [headless execution](https://code.claude.com/docs/en/headless).

## No PR yet, or no model credential

Synthetic input removes the GitHub dependency while exercising the same preparation and adapters:

```bash
npm run review:local -- --reviewer claude --fixture regression --runtime native --prepare-only
npm run review:local -- --reviewer copilot --fixture regression --image review-env:local
```

Use `--fixture healthy` for a passing calculator. Supply an explicit local `--image` for offline Docker preparation; the default main-image lookup uses repository metadata. Actual inference still requires a provider connection and credential.

For **real MCP and browser checks without any model**, use the existing scripted client:

```bash
npm run demo:local -- .venv-serena/bin/serena
```

On Windows use `.venv-serena/Scripts/serena.exe`. This verifies real Serena, test execution, and receipts but deliberately reports `LOCAL_PROTOCOL_VERIFIED`, not an AI review.

## github-aw and Codex locally

The [rejected gh-aw image experiment](../reviewers/github-aw/README.md) can be built locally. It is separate from the supported review adapters.

## Results and fidelity

Every invocation gets a fresh directory. `prompt.txt`, `input.json`, and `environment.json` explain what was reviewed; `mcp.jsonl`, `checks.json`, `smoke.png`, and `review.json` record actual tool evidence. A successful agent run adds `report.md` and `local-result.json` with **`LOCAL_REVIEW_VERIFIED`**. `LOCAL_PREPARED` proves preparation only; `BLOCKED` indicates a missing dependency, credential, model, or valid tool result.

No local result is a hosted PASS or publication receipt. The PR head can move after the snapshot; the local report remains about its recorded SHA. To publish through the original commit-rechecking path, dispatch the hosted workflow. Local directories can include agent caches/logs, so treat them as private; they are ignored by Git and never uploaded automatically.

| Property | Hosted image workflows | Local runner |
| --- | --- | --- |
| PR selection | Provider label or manual Actions input | `--pr` + optional `--repo`, or synthetic `--fixture` |
| GitHub authentication | Job-scoped token; maintainer preflight | Existing `gh` login; read-only requests |
| Inference secrets | Repository/environment secrets | Shell environment, selected credential only |
| Source | Main image matching dispatch commit | Chosen image or trusted working checkout |
| Prompt/MCP/fixtures | Common implementation | Reused; native runtime versions can differ |
| Evidence | Receipts + image + successful publication | Same receipt/check validation; explicitly local status |
| GitHub writes | Separate publisher after head recheck | None |
