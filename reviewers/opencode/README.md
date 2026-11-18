# OpenCode

**Account and model.** Use an OpenCode Go subscription, obtain the member key in the Go console and disable **Extra Usage** to keep inference within the subscription. Include `opencode` in `DEMO_REVIEWERS`. The workflow uses Kimi K3 (`opencode-go/kimi-k3`) for both the primary and small model, with the model’s default reasoning settings. [OpenCode Go catalog](https://opencode.ai/docs/console/go/)

```dotenv
OPENCODE_GO_API_KEY=your-go-member-key
```

**Trigger.** Apply the `review:opencode` label to request a review; the demo does this for you. Ask a question with `/oc` or `/opencode` anywhere in a PR conversation comment, inline review comment or the text of a submitted review:

```text
/oc What evidence on the current commit supports that conclusion?
```

[Workflow](../../.github/workflows/review-opencode.yml)

**How it runs.** The workflow runs `opencode github run`, OpenCode's own GitHub agent, which is what the upstream `anomalyco/opencode/github` action runs after installing the latest release. Here it uses the CLI pinned in the project image instead. For a conversation comment or the label, the agent checks the requester's write access, reacts with 👀, checks out the PR branch, builds the prompt from the PR and posts its answer in the PR conversation. A label-triggered run uses OpenCode's default prompt, "Review this pull request". Requests in inline threads and review texts take the workaround path described below. [OpenCode GitHub docs](https://opencode.ai/docs/github/)

The workflow writes an OpenCode config with the Go provider, Serena MCP and two instruction files: [review/INSTRUCTIONS.md](../../review/INSTRUCTIONS.md) and [github.md](github.md), which asks for inline findings through `gh` and forbids edits. File edits are also denied in the config. If the working tree is left changed, `opencode github run` commits and tries to push, which fails because the job token cannot push.

**Deviations from the standard setup.** The baseline is the upstream workflow: `anomalyco/opencode/github` on `issue_comment` and `pull_request_review_comment`, triggered by `/oc` or `/opencode`.

| Deviation | Why |
| --- | --- |
| Run `opencode github run` from the image instead of the action | The action only installs the latest release and runs that command. Running it from the image pins the version and keeps the agent next to Serena in the project container. |
| `USE_GITHUB_TOKEN=true` | Avoids installing the OpenCode GitHub App; comments come from `github-actions[bot]`. |
| An OpenCode config (`OPENCODE_CONFIG`) with the Go provider, Serena, denied edits and two instruction files | The action has no inputs for these. Denied edits matter because the agent commits and pushes anything left changed. |
| `review:opencode` label on `pull_request` for the first review | The upstream agent supports `pull_request` events with its default review prompt; the label makes the request explicit. |
| Inline threads and review texts use plain `opencode run` (workaround) | Up to v1.19.6 the agent answers inline-thread questions with a top-level comment and rejects `pull_request_review` events. The workaround repeats the write-access check and 👀 reaction, passes the thread's file, line and diff, and has the agent reply in the thread (or, for a review, in the conversation). It does not pass images from the comment, and a failure shows only in the Actions run. Return these events to the native path once OpenCode replies in threads. |
| The job-level `if:` filters on `author_association` | Comments from people outside the repository are skipped before a runner starts. |
| The job runs in the project image, with a git `safe.directory` step | The agent and Serena run in the project's environment; git needs the exception inside a job container. |

**Local runs.** `npm run review:local -- --reviewer opencode` still uses the fixture MCP pipeline with [prompt.md](prompt.md) and [run.mjs](run.mjs). [Local runs](../../docs/LOCAL_RUNS.md)
