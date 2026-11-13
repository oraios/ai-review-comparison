# Results — 13 November 2026

**No candidate has PASS status.** Four image adapters and one compiled github-aw comparator are implemented, with guides for two hosted Codex paths. No inference token, hosted image build, or GitHub PR publication has been exercised. Repository inspection found no configured Actions secrets or variables and no open PR. The repository was private during implementation; neither visibility nor remote contents were changed.

## Candidate acceptance

| Priority for this demo | Candidate | Implementation | Exact project image in authenticated CI | Actual MCP consumed by model | Checks invoked by model | GitHub review | Acceptance |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Claude Code Action | Label/manual workflow, subscription OAuth, bounded tools | Not run | Not run | Not run | Not run | **BLOCKED: AUTH_MISSING / HOSTED_RUN_REQUIRED** |
| 2 | Copilot CLI | Label/manual workflow, personal PAT/seat, custom publisher | Not run | Not run | Not run | Not run | **BLOCKED: AUTH_MISSING / HOSTED_RUN_REQUIRED** |
| 3 | OpenCode CLI | Label/manual workflow, Go subscription-issued key, common publisher | Not run | Not run | Not run | Not run | **BLOCKED: AUTH_MISSING / MODEL_CONFIG / HOSTED_RUN_REQUIRED** |
| Comparator | github-aw Codex | v1.2.2 source/lock; label/manual trigger; Copilot inference; custom-image MCP containers and publisher | Tools image only; not run | Not run | Not run | Not run | **COMPILED / HOSTED_RUN_REQUIRED** |
| Hosted | Codex on OpenAI | Setup/instructions guide and generic PR prompt | No image-parity claim | Unverified | Not run | Not run | **GUIDED / HOSTED_RUN_REQUIRED** |
| Hosted | Codex on GitHub | Copilot subscription guide and generic PR prompt | Managed environment | Unverified | Not run | Not run | **GUIDED / HOSTED_RUN_REQUIRED** |
| Gate | goose + Claude ACP | Disabled prototype only | Not run | Not run | Not run | Not run | **BLOCKED: SUBSCRIPTION_CI — headless ACP validation** |
| Gate | Cline | Disabled prototype only | Not run | Not run | Not run | Not run | **BLOCKED: SUBSCRIPTION_CI** |
| API exception | OpenHands SDK | Independent native SDK workflow with custom MCP and isolated publisher | Not run | Not run | Not run | Not run | **BLOCKED: AUTH_MISSING / MODEL_CONFIG / HOSTED_RUN_REQUIRED** |

Priority reflects documented public-OSS subscription viability and implementation fit, not measured model quality or reliability. Claude supplies a native Action; Copilot has documented seat-backed CI but requires our PR glue. OpenHands requires API funding. There are no comparable authenticated runs from which to rank quality, latency, cost or reliability yet.

## Actual local evidence

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

1. Land the implementation on `main` and let **Publish review image** build/test/publish. This is the first Linux container compatibility gate; successful YAML validation is insufficient.
2. Fill `.env` with intended credentials and matching OpenCode/OpenHands model IDs, then run `npm run setup-ci-secrets`. See [README setup](../README.md#start-a-labeled-comparison). Do not store ChatGPT session files.
3. Run `npm run demo-review-on-gh` to create and label one controlled PR per selected reviewer, and wait for actual review URLs.
4. Preserve each run's `AGENT-input-RUN-ATTEMPT`, `AGENT-evidence-RUN-ATTEMPT`, and `AGENT-publication-RUN-ATTEMPT` artifacts. Record image digest, baked source commit, agent/version/model, auth route, findings, latency, quota/cost observations and GitHub review URL.
5. Count image-run PASS only when `published.json` contains a real GitHub review ID/URL and all preceding evidence checks passed. github-aw has a separate `COMPARATOR_REVIEW_PUBLISHED` status, and hosted paths require their own run records. A reproduced regression is expected; missing execution is not success.

## Authenticated run ledger

No rows yet. Add real runs using this schema; never populate guessed values:

| UTC timestamp | Candidate/version/model | Workflow URL | Image digest/source commit | Credential type / billing owner | MCP receipts | Test/browser results | PR review URL | Duration / usage | Status/reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
