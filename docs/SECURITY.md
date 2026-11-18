# Demo security boundary

This repository does not provide a sandbox for arbitrary executable pull requests with long-lived provider credentials. The GitHub workflows follow each vendor's standard setup; the local runners keep a stricter fixture pipeline.

## GitHub review workflows

`review-claude.yml`, `review-copilot.yml` and `review-opencode.yml` start when someone writes the reviewer's command in a PR comment, inline review comment or review (or, for OpenCode, applies the `review:opencode` label). A job-level filter skips comments and reviews from anyone who is not a repository owner, organization member or collaborator before a runner starts. Each job then requires write access: Claude Code Action and `opencode github run` check it themselves; the Copilot workflow and OpenCode's workaround path look it up with the GitHub API. The agent runs in the project image on a checkout of the PR branch, with normal tools (shell, file reads, Serena) and a job token that can comment on the PR but cannot push.

The provider credential is in the same job as PR content, so a prompt injection in a PR could try to exfiltrate it. Comment-triggered runs always receive secrets, including on PRs from forks, so the write-access gate on the commenter is the only control: ask for a review only on PRs whose code you are willing to run with those credentials. Label-triggered OpenCode runs use the `pull_request` event, which gets no secrets on PRs from forks.

Image resolution is fixed to `ghcr.io/oraios/ai-review-comparison/review-env:main`. After a `[skip-image-build]` push the image can predate the current main commit. Action commits are pinned; registry publishers, default-branch maintainers and dependencies remain trusted.

## Local fixture pipeline

`npm run review:local` reviews only the numeric pricing fixture and never publishes.

1. The PR snapshot must be open, target main, come from the same repository and modify only the numeric pricing JSON. Parsing rejects unknown keys, non-integers, excessive lengths and out-of-range values.
2. No PR checkout, hooks, instructions, MCP config, scripts, URLs or browser content reach the agent. Trusted application and test code come from the image or checkout; only the validated numbers are substituted.
3. Reviewer tools consist of the trusted project MCP server and a restricted adapter to actual Serena. The adapter exposes only a root directory listing with fixed arguments. Serena's individual `tools` interface is used; its Python REPL is not exposed. The provider cannot invoke shell, arbitrary reads, edit tools or browser navigation.
4. MCP and browser subprocess environments are allowlisted. Disposable homes contain no user account session. The local app serves fixed trusted HTML and numeric quote results; browser requests outside its local origin are aborted.
5. Unique MCP receipts plus actual statuses must be returned by the model. Merely configuring a server or echoing the known marker fails validation.
6. Only the selected inference credential reaches the adapter; the GitHub login is not forwarded. Native execution trusts the working checkout; Docker execution uses the selected image, inspected to its content ID. Local output directories may contain private agent logs and caches; they are ignored by Git and not uploaded.

## Other notes

No alternate-provider fallback is implemented. OpenCode uses a Go subscription-issued key and confines all models to that provider; its **Extra Usage** billing switch must be disabled by the account owner. Cline and goose retain disabled prototypes. Saved ChatGPT/Codex account authentication is not used for public CI. Metered provider API routes are excluded.

The independent gh-aw image experiment builds from main and verifies a shell command through AWF. Its compiled example is an artifact. It does not accept PR requests or receive a subscription token. [Rejected gh-aw route](../reviewers/github-aw/README.md)

The generic hosted prompt helper makes read-only GitHub requests using the caller's existing `gh` authentication and sends no prompt or comment. Hosted tasks use that platform's permissions and environment.

Repository write access can change a workflow and read repository secrets; protect main and limit who has write access. If that trust model is insufficient for your organization, configure protected environments and scoped credentials before enabling inference.
