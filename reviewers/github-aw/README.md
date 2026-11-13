# Codex through GitHub Agentic Workflows

This comparator runs the **Codex engine** with **GitHub Copilot inference** in github-aw's managed sandbox. The project and Serena MCP servers run in this repository's custom main-branch image. It demonstrates a reusable tools environment while retaining the framework's agent isolation.

The output is a scoped evidence artifact and a separately published PR COMMENT review. It uses the same fixture checks and actual MCP receipts as image runs, progressing from `COMPARATOR_EVIDENCE_VERIFIED` to `COMPARATOR_REVIEW_PUBLISHED`. It cannot claim that Codex ran inside our project image. The publisher waits for the agent and framework detection jobs and revalidates the current PR head.

For local exploration, v1.2.2 supports compilation and dispatch preview, not local agent execution. The [local guide](../../docs/LOCAL_RUNS.md#github-aw-and-codex-locally) provides exact commands and a local Codex prompt alternative, with the environment/auth differences stated explicitly.

## Setup and invocation

1. Publish the latest main image using `build-image.yml` and grant the repository access to the GHCR package.
2. Configure `COPILOT_GITHUB_TOKEN` with a fine-grained personal PAT with Copilot Requests access and an eligible Copilot entitlement.
3. Confirm `copilot/gpt-6.1-sol` in `engine.model` is available to that account; edit and recompile if needed.
4. Apply `gh pr edit 123 --add-label review:github-aw`, or dispatch `gh workflow run aw-codex.lock.yml --ref main -f pr_number=123`.
5. Inspect the PR review and `github-aw-evidence-RUN-ATTEMPT` / `github-aw-publication-RUN-ATTEMPT`, plus the framework's run artifacts and model-resolution logs. The root setup/demo scripts automate these steps alongside the other providers.

This route is documented by [github-aw's Codex reference](https://github.github.io/gh-aw/reference/engines/codex/). It does not use ChatGPT subscription login, `OPENAI_API_KEY`, or a copied Codex auth file. Organization-funded `copilot-requests: write` is an alternative requiring a deliberate billing/policy choice; it is not enabled here.

## Source and compilation

The editable source is [aw-codex.md](../../.github/workflows/aw-codex.md). The lock YAML and `.github/aw/actions-lock.json` are generated with **gh-aw v1.2.2**. Install the [pinned release](https://github.com/github/gh-aw/releases/tag/v1.2.2), then:

```bash
gh aw compile aw-codex
```

Commit source, lock, and action lock together. `gh aw compile aw-codex --validate` validates the Actions schema, frontmatter, and action pins, then generates framework jobs. The checked-in source passed with zero warnings. actionlint v1.7.12 predates generated `concurrency.queue`, `cache-mode`, and `job.workflow_ref`/`job.workflow_sha`; these are supported by current [GitHub.com workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax) and [job contexts](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts#job-context). Use actionlint for the ordinary workflows and the compiler's validator for this generated lock. Compilation is not a hosted execution test.

The authored new action is the SHA-pinned Docker login action: it receives the job's package-read GitHub token for GHCR pulls. No new inference secret beyond `COPILOT_GITHUB_TOKEN` is needed. The generated framework also references optional GH_AW token/telemetry secrets; leave those unset unless intentionally configuring framework behavior. Review generated changes when upgrading, including framework artifact retention and permissions.

## Custom image and MCP handoff

Setup verifies the maintainer, same-repository numeric PR fixture, immutable head/base, and latest main image revision. A setup container prepares the fixture and prompt using that digest. Project and Serena tools then run as sibling containers with a shared isolated run directory and no network.

The v1.2.2 MCP `container` field requires a literal reference. Before MCP startup, the setup step retags the **verified local digest** as the literal `ghcr.io/oraios/ai-review-comparison/review-env:main`; each MCP invocation uses `--pull never`. Thus a later registry tag change cannot replace the already verified local image during the run. In a fork, change all literal image occurrences and recompile. The agent and MCP containers do not receive the host Docker socket.

The gateway starts real Serena through the same restricted adapter used by other reviewers. Project context supplies shared review instructions and metadata, and the model must return actual context/Serena/check receipts. The run directory `/tmp/review-demo-aw` is outside the agent's shared `/tmp/gh-aw` mount. The post-step validates evidence in the resolved tools image. Model-controlled publishing and automatic issue reporting are disabled; a separate deterministic job publishes the validated review. The compiler still reserves `issues: write` on its conclusion job, which must be reviewed separately from the read-only agent permissions.

## Other environment choices

Current github-aw supports custom agent images through `sandbox.agent.images`. This is a complete, digest-pinned AWF image manifest: at minimum `agent`, `squid`, and `api-proxy`, with additional roles for enabled features. Values must be literal tagged references with digests; arbitrary runtime expressions are rejected. The agent image must satisfy AWF's runtime contract. Our project Dockerfile has not been validated as an AWF agent replacement. [Sandbox reference](https://github.github.io/gh-aw/reference/sandbox/).

The checked-in approach instead uses documented setup steps and custom MCP containers. On GitHub-hosted Ubuntu the daemon can run sibling containers, so nested Docker/privileged DinD is unnecessary. For other dependencies, add deterministic setup before the agent, or package them with the MCP tools. [Custom steps](https://github.github.io/gh-aw/reference/steps-jobs/), [MCP configuration](https://github.github.io/gh-aw/guides/mcps/).
