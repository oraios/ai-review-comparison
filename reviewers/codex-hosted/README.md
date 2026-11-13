# Hosted Codex comparisons

Codex has subscription-backed hosted options on both OpenAI and GitHub infrastructure. They belong in the comparison even when their agent environment differs from this repository's Docker image. Neither option requires exporting your local Codex account credentials into Actions.

The same generated PR prompt can also run in a locally authenticated Codex session. See [local Codex instructions](../../docs/LOCAL_RUNS.md#github-aw-and-codex-locally); this reuses review context, not the hosted service or github-aw's Copilot inference route.

## OpenAI-hosted review or cloud task

Sign in with an eligible ChatGPT account, connect GitHub, and allow this repository. Enable code review for the repository in the hosted Codex settings. Comment **`@codex review`** on the demo PR for an on-demand review; enable automatic reviews in those settings when demonstrating the automatic path. Custom review guidance can live in `AGENTS.md` or the available review settings/presets. [GitHub integration](https://learn.chatgpt.com/docs/third-party/github), [review customization](https://learn.chatgpt.com/docs/code-review).

For a general task, generate a prompt with `node scripts/hosted-prompt.mjs OWNER/REPO NUMBER`, then paste `artifacts/hosted-review-prompt.txt` into a Codex Cloud task with access to the repository. It supplies the common instructions, PR number, immutable commits, and `gh` read commands. Ask for a review without implementation changes.

For prepared task environments, choose **Work in → Cloud → Create environment**, select the repository, and ask setup to install the project's dependencies and test tools. Run `npm ci --ignore-scripts`, install Chromium using the pinned Playwright package, and run the fixture checks. Serena's pinned installation command is in the root README. Test the environment, then publish it. Configure direct environment variables or destination-scoped HTTP secrets in that environment's settings when a service requires them; this local Serena example requires none.

Current prepared cloud task environments and **Codex Cloud (Legacy)** are different experiences. The latter still serves the GitHub integration and Code Review. Do not assume a prepared task environment, a CLI MCP config, or an arbitrary Docker image is automatically used by native review. We have not verified custom Serena execution or arbitrary base-image replacement in either hosted review account. Record missing capabilities honestly. [Cloud environments and legacy distinction](https://learn.chatgpt.com/docs/environments/cloud-environments).

The subscription's entitlement, workspace policy, and usage limits apply; OpenAI API billing is a separate route. OpenAI's warning about reusing saved ChatGPT auth in public/OSS CI concerns that credential pattern, not these managed integrations. [Automation authentication](https://learn.chatgpt.com/docs/non-interactive-mode#authenticate-in-automation).

## GitHub-hosted Codex agent

GitHub offers OpenAI Codex as a third-party coding agent through paid Copilot plans, subject to policy and preview availability. This runs the Codex SDK as an agent; it is not merely selecting an OpenAI model in Copilot CLI or requesting native Copilot Code Review. [GitHub's third-party agents](https://docs.github.com/en/copilot/concepts/agent-capabilities/about-agents/about-third-party-coding-agents).

1. Sign in to the GitHub account with the paid Copilot entitlement. Have the organization enable the partner agent if its policy requires it.
2. Open the repository's **Agents** experience and select **Codex** and an available model.
3. Paste the generated prompt above with the existing PR and request review only. GitHub also documents issue assignment and agent mentions in PRs; use the agent identity shown by that UI to distinguish this from OpenAI's connected `@codex review` integration.
4. Save the task/review URL, inspected SHA, chosen model, findings, actual tools/tests, and observed usage for comparison.

Merge [AGENTS.example.md](AGENTS.example.md) into the repository's existing guidance if appropriate, and keep the policy in the initial prompt for portability. Verify partner-specific MCP and setup support in the selected agent before installing credentials or claiming Serena/image parity; Copilot-specific setup files are not proof of Codex compatibility. The repeatable custom-MCP Codex alternative in this repo is [github-aw](../github-aw/README.md).

## Evidence to compare

Record service, subscription/billing owner, model, head commit, instructions, real tools/checks, finding quality, duration, usage, and output URL. A useful static hosted review remains useful even without browser or MCP access; label those capabilities unverified instead of marking a strict custom-image PASS. No hosted account configuration or review was performed during implementation.
