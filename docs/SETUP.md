# Configure the GitHub demo

Push the implementation to the target repository’s default branch, `main`. Use Node.js 22+ with npm. The two setup commands use Node built-ins and locate GitHub CLI automatically. Docker, gh-aw, Serena and the reviewer CLIs run on GitHub.

## Fill in the environment

Use [.env.template](../.env.template) as the starting point for the ignored `.env`. The minimal selection for Copilot CLI looks like this when your administrator account is already signed in to `gh`.

```dotenv
DEMO_REVIEWERS=copilot
COPILOT_GITHUB_TOKEN=your-personal-copilot-token
```

| Selection | Required settings |
| --- | --- |
| `copilot` | `COPILOT_GITHUB_TOKEN` is a fine-grained personal token with **Copilot Requests** permission on a seat with access to Claude Sonnet 5.5. |
| `claude` | `CLAUDE_CODE_OAUTH_TOKEN` comes from `claude setup-token` on the subscribed Claude account. |
| `opencode` | `OPENCODE_GO_API_KEY` is the member key from the subscribed Go account. Disable **Extra Usage** in the Go console. |

Use a comma-separated list to select multiple reviewers. Provider quotas and organization model policies apply. Disable paid overages on your account if you need a hard spending limit. GitHub Actions and GHCR have their own quotas.

## Repository access

The scripts infer the target from the Git origin. Set `GITHUB_REPOSITORY=OWNER/REPO` to override it. If you already ran `gh auth login` for github.com, leave `GH_TOKEN` blank. Both npm commands reuse the active login on macOS, Linux and Windows, including Git Bash. They honor your shell’s `GH_CONFIG_DIR` or `XDG_CONFIG_HOME` if you use a custom configuration directory. You can also supply a personal administrator token through `GH_TOKEN`. Setup opens the login flow when GitHub CLI requires authentication.

The administrator needs to manage Actions settings, secrets, variables, labels, branches and PRs. A fine-grained setup token needs the corresponding Administration, Actions, Secrets, Variables, Issues, Contents and Pull requests permissions. Repository rules must permit creating `codex/*` branches and the workflows’ pinned actions. Private GHCR packages must grant this repository Actions access.

## Run the comparison

```sh
npm run setup-ci-secrets
npm run demo-review-on-gh
```

1. Setup checks the selected credentials, enables the workflows, creates the reviewer labels and uploads the selected secrets. It waits for the successful image build at the current `main` SHA.
2. The demo creates and labels one PR per selected reviewer. It writes the PR and review URLs under `artifacts/github-demo-*.json`. A second invocation creates a fresh set of PRs.

To preview either command, append `-- --dry-run`. Use `-- --no-wait` with the demo to return after labeling. Both commands accept `--env PATH`, `--repo OWNER/REPO`, `--reviewers NAME,NAME` and `--timeout-minutes N`. Rerun setup after pushing a new main revision or changing credentials.

## If a review does not arrive

Open **Actions → Publish review image** for image and gh-aw compilation errors. For a labeled PR or comment, open **Route PR review request**, then the corresponding reviewer run. Check model entitlement and provider quota if inference fails. The publisher checks the PR head again and records GitHub’s review receipt in the publication artifact. A new comment retries an existing PR. [Review triggers](TRIGGER_MATRIX.md) · [Provider authentication](AUTH_MATRIX.md)
