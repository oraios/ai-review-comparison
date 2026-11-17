# Results

> **17 November 2026:** the Claude and Copilot GitHub workflows were replaced by comment-triggered workflows (`@claude`, `/copilot`) that run the agents directly on the PR. The results below predate that change; the new workflows have not yet run on GitHub.

**The hosted Linux image build passed on 16 November 2026.** GitHub Actions built commit `433a528`, ran the fixture tests, exercised real Serena over MCP and Chromium inside the image, then published the linux/amd64 image. The GHCR index digest was `sha256:c0188b2abb6d59c31609d42c4c5b4f62d6e8f1f1011889e509e68485fe1c028d`. [Build and publication log](https://github.com/oraios/ai-review-comparison/actions/runs/43897795402) · [Fixture CI](https://github.com/oraios/ai-review-comparison/actions/runs/43897795525)

## Current comparison

Claude Code, Copilot CLI and OpenCode Go are retained. All three run Serena in the project container. Codex via gh-aw was rejected because its gateway launches Serena separately. The custom Codex image was built locally from the published demo base using AWF v0.29.11. The real firewall started the custom agent and its pinned proxy containers locally. The agent-side check executed the image’s own Node binary and project code inside a chroot with the runner’s system paths mounted. The gh-aw workflow compiled with the GitHub model provider and pinned container roles.

The local Linux project-image build passed its Serena MCP and Chromium checks. All 24 Node tests passed, including the model selections and PR follow-up authorization. An offline check captured the arguments passed by the review adapters and confirmed Sonnet 5.5 at medium effort for Claude and Copilot, and Kimi K3 for OpenCode Go. The GitHub workflows passed actionlint. Both npm commands completed a dry run using the environment template.

No authenticated review URL has been recorded for these revisions. The [provider decisions](DISCARDED.md) describe the routes excluded under the subscription and image requirements.

## Local evidence from 13 November 2026

The [machine-readable local record](evidence/local-validation.json) contains real tool-call timestamps, unique receipts, the actual upstream Serena result, test/browser results and the explicitly scripted submission. It records `LOCAL_PROTOCOL_VERIFIED`, **never PASS**. No account credentials or remote review were used.

| Check | Observed result |
| --- | --- |
| Node unit/security tests | 20 tests passed, including label-delegation authorization, dotenv/secret handling, setup/PR API orchestration, all five publication modes, image/review failure gates, immutable snapshots, credential isolation, evidence boundaries, and pricing/MCP/prompt checks |
| Local reviewer preparation | `review:local --reviewer claude --fixture regression --runtime native --prepare-only` succeeded on Windows; generated prompt and MCP configuration without credentials or inference |
| Local PR access | Existing `gh` login resolved this repository and queried open PRs. None existed, so a live PR-snapshot review could not be exercised; snapshot/race validation uses mocked API tests |
| Local inference | Docker/native entry points implemented for four reviewers; no provider call performed. Docker daemon unavailable and native agent execution limited to Linux/macOS/WSL |
| Healthy fixture assertions | All 6 boundary cases passed |
| Healthy browser smoke | Chromium 158.0.8127.18 returned `Shipping: $4.99 · Total: $54.98` for $49.99 |
| Real Serena MCP | Pinned `6e5c377…` server, tools interface; `list_dir` actually returned `pricing.json` and `pricing.mjs`; model-free client consumed response |
| Traversal attempt | Adapter rejected `relative_path: ".."` |
| Regression assertions through MCP | Executed; failed at 500 and 4999 cents, as expected |
| Regression browser through MCP | Executed; returned `Shipping: $0.00 · Total: $49.99`, correctly failing the $4.99/$54.98 expectation |
| Evidence submission | Valid receipts accepted; mocked missing receipts and false status claims rejected by tests |
| Ordinary workflows | YAML parsing, generated-file drift, permission/trigger/action pins passed; actionlint 1.7.12 passed |
| github-aw | v1.2.2 `compile --validate` passed with zero warnings, including Actions schema validation. YAML/pins/agent and publisher permissions checked. actionlint 1.7.12 rejects the generated queue/cache/job-context fields; those are valid in current GitHub.com documentation. No hosted runtime test. |
| OpenCode CLI | 1.19.5 package pinned; current provider catalog confirms `opencode-go`. Windows binary incompatible with this host, like Claude; Linux image execution remains pending. No auth attempt. |
| OpenHands SDK | Version 1.62.0 imported locally; native `Conversation`/`MCPServer` signatures and Python syntax checked; no LLM call |
| Copilot CLI | Installed version 1.0.110 launched; configured MCP/permission flags confirmed in its actual help; no inference call |
| Claude CLI | The pinned npm package installed, but its Windows executable was rejected as incompatible with this host. The target Linux executable still requires the image build check; no authentication attempted. |
| Dependency audit | Root npm dependencies: zero reported vulnerabilities after pinning yaml 2.9.1 |
| Docker execution | **Not verified locally**: Docker CLI exists, but the Linux engine pipe is unavailable. The base-image manifest/digest was resolved remotely. |

During validation the Windows Chromium **headless shell** crashed at page creation. Switching to the full bundled Chromium's headless channel resolved it; the healthy smoke and full Serena/MCP regression path subsequently succeeded. This is a local compatibility finding, not evidence of Linux container compatibility.

## Remaining first-run work

1. Fill `.env` for the selected reviewers and run `npm run setup-ci-secrets`. Setup waits for the image for the current remote main commit. [setup guide](SETUP.md)
2. Run `npm run demo-review-on-gh` to create and label one controlled PR per selected reviewer and wait for the review URLs.
3. Record each review URL and its evidence in the ledger. Image runs reach `PASS` when `published.json` contains a GitHub review receipt after validation.

## Authenticated run ledger

No rows yet. Add real runs using this schema; never populate guessed values:

| UTC timestamp | Candidate/version/model | Workflow URL | Image digest/source commit | Credential type / billing owner | MCP receipts | Test/browser results | PR review URL | Duration / usage | Status/reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
