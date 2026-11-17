# OpenCode

**Account and model.** Use an OpenCode Go subscription, obtain the member key in the Go console and disable **Extra Usage** to keep inference within the subscription. Include `opencode` in `DEMO_REVIEWERS`. The workflow uses Kimi K3 (`opencode-go/kimi-k3`) for both the primary and small model, with the model’s default reasoning settings. [OpenCode Go catalog](https://opencode.ai/docs/console/go/)

```dotenv
OPENCODE_GO_API_KEY=your-go-member-key
```

**Trigger.** Apply the `review:opencode` label to request a review; the demo does this for you. Ask a question with `/oc` or `/opencode` anywhere in a PR conversation comment or inline review comment:

```text
/oc What evidence on the current commit supports that conclusion?
```

[Workflow](../../.github/workflows/review-opencode.yml)

**How it runs.** The workflow runs `opencode github run`, OpenCode's own GitHub agent, which is what the upstream `anomalyco/opencode/github` action runs after installing the latest release. Here it uses the CLI pinned in the project image instead. The agent checks the commenter's write access, reacts with 👀, checks out the PR branch and posts its answer in the PR conversation, also for questions asked in an inline thread. A label-triggered run uses OpenCode's default prompt, "Review this pull request". It does not support requests in the text of a submitted review. [OpenCode GitHub docs](https://opencode.ai/docs/github/)

The workflow writes an OpenCode config with the Go provider, Serena MCP and two instruction files: [review/INSTRUCTIONS.md](../../review/INSTRUCTIONS.md) and [github.md](github.md), which asks for inline findings through `gh` and forbids edits. File edits are also denied in the config. If the working tree is left changed, `opencode github run` commits and tries to push, which fails because the job token cannot push.

**Local runs.** `npm run review:local -- --reviewer opencode` still uses the fixture MCP pipeline with [prompt.md](prompt.md) and [run.mjs](run.mjs). [Local runs](../../docs/LOCAL_RUNS.md)
