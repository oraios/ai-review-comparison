# Demo security boundary

The automated workflows use a controlled fixture. Hosted comparisons are a separate trust boundary. This repository does not provide a sandbox for arbitrary executable pull requests with long-lived provider credentials.

## Claude and Copilot comment workflows

`review-claude.yml` and `review-copilot.yml` follow the vendors' standard setup instead of the controls below. A comment from someone with write access starts the agent in the project image on a checkout of the PR head. The agent has normal tools (shell, file reads, Serena) and a job token that can comment on the PR but cannot push. The provider credential is in the same job as PR content, so a prompt injection in a PR could try to exfiltrate it. Comment-triggered runs always receive secrets, including on PRs from forks, so the write-access gate on the commenter is the only control: ask for a review only on PRs whose code you are willing to run with those credentials.

## OpenCode fixture pipeline

The numbered controls below describe the OpenCode workflow and the local runners.

1. Only a main-branch maintainer dispatch or a verified label-router dispatch can enter a reviewer workflow. Both actor identities are checked. The `pull_request_target: labeled` router has no checkout or inference secrets and only dispatches fixed workflows. Preparation resolves a bot dispatch back to its router run and checks the human label setter/rerun actor and current label. PRs must be open, target main, come from this repository and modify only the numeric pricing JSON. Parsing rejects unknown keys, non-integers, excessive lengths and out-of-range values.
2. No PR checkout, hooks, instructions, MCP config, scripts, URLs or browser content enter the credentialed job. Trusted application and test code are baked in the main-built image. Only the validated numbers are substituted. Normal PR CI is a separate credential-free workflow.
3. Image resolution is fixed to this repository's GHCR main tag; the source label and the presence of a commit revision are checked, then the reviewer runs by digest. After a `[skip-image-build]` push the image can predate the current main commit. Source, action commits and direct dependencies are pinned. Registry publishers, default-branch maintainers and dependencies remain trusted. Labels and receipts are evidence of this pipeline's execution, not independent cryptographic attestations of provider behavior.
4. Reviewer tools consist of the trusted project MCP server and a restricted adapter to actual Serena. The adapter exposes only a root directory listing with fixed arguments. Serena's individual `tools` interface is used; its Python REPL is not exposed. The provider cannot invoke shell, arbitrary reads, edit tools or browser navigation.
5. MCP and browser subprocess environments are allowlisted. Disposable homes contain no user account session. There is no Docker socket, persistent runner, proxy or shared service. The local app serves fixed trusted HTML and numeric quote results; browser requests outside its local origin are aborted.
6. Provider credentials are passed only to their own invocation. The GitHub publish job runs separately, has PR write permission and no provider secrets. Model text is schema/length checked; publication uses a structured API body, never shell evaluation. Mentions/HTML are neutralized. Summaries are COMMENT reviews, not approval decisions.
7. Unique MCP receipts plus actual statuses must be returned by the model. Merely configuring a server or echoing the known marker fails validation. Review jobs cannot mark PASS; publishing requires a real GitHub receipt and checks that the PR head is still the inspected SHA.
8. Artifacts use an explicit filename allowlist. Account homes, raw transcripts, session stores, MCP-home logs and OAuth files are excluded. Public artifacts still contain the reviewed fixture data and findings. Retention is finite.

No alternate-provider fallback is implemented. OpenCode uses a Go subscription-issued key and confines all models to that provider; its **Extra Usage** billing switch must be disabled by the account owner. Cline and goose retain disabled prototypes. Saved ChatGPT/Codex account authentication is not used for public CI. Metered provider API routes are excluded.

The independent gh-aw image experiment builds from main and verifies a shell command through AWF. Its compiled example is an artifact. It does not accept PR requests or receive a subscription token. [Rejected gh-aw route](../reviewers/github-aw/README.md)

The same router accepts new top-level PR comments. Before inference it checks the comment author’s current permission, PR identity, selected reviewer and unedited command. The question is passed as data in the review prompt. A follow-up uses fresh MCP receipts.

The generic hosted prompt helper makes read-only GitHub requests using the caller's existing `gh` authentication and sends no prompt/comment. Subsequent hosted tasks use that platform's permissions and environment. They do not inherit the numeric-only sandbox or the receipt-based PASS guarantee. Their capabilities and outputs must be recorded separately.

The local runner reuses the numeric-only snapshot validation through `gh api`, but skips the maintainer dispatch gate because it does not publish. Native execution trusts the working checkout; Docker execution uses the selected image, inspected to its content ID. Local image/source parity is recorded, not enforced like CI. Only the selected inference credential reaches the adapter; the GitHub login is not forwarded. Local results use a distinct marker/status and cannot satisfy hosted publication validation. Local output directories may contain private agent logs/caches; they are ignored by Git and not automatically uploaded.

Repository write access can change a workflow and read repository secrets; protect main and limit who has write access. If that trust model is insufficient for your organization, configure protected environments and scoped credentials before enabling inference. Workflow approval for a fork does not expand this demo's accepted PR boundary.
