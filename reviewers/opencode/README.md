# OpenCode CLI

**Account and model.** Use an OpenCode Go subscription, obtain the member key in the Go console and disable **Extra Usage** to keep inference within the subscription. Include `opencode` in `DEMO_REVIEWERS`. The workflow uses Kimi K3 (`opencode-go/kimi-k3`) for both the primary and small model, with the model’s default reasoning settings. [OpenCode Go catalog](https://opencode.ai/docs/console/go/)

```dotenv
OPENCODE_GO_API_KEY=your-go-member-key
```

**Initial review.** Run the [two demo commands](../../docs/SETUP.md). The demo applies `review:opencode`. A maintainer can apply it to an eligible existing PR or dispatch `review-opencode.yml` on `main` with `pr_number`. The image contains the CLI and launches both MCP servers.

**Follow-up.** Post a new top-level comment such as `/review opencode What evidence on the current commit supports that conclusion?`. The reviewer receives your question and its earlier review when available. Further pushes can be reviewed by adding another comment or reapplying the label. Commit-message tags and the upstream OpenCode Action’s `/oc` and `/opencode` commands do not dispatch this repository’s CLI workflow. [Trigger reference](../../docs/TRIGGER_MATRIX.md) · [Workflow](../../.github/workflows/review-opencode.yml)
