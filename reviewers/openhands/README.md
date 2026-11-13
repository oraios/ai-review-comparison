# OpenHands native SDK

Implemented manual workflow: [review-openhands.yml](../../.github/workflows/review-openhands.yml). Acceptance is **BLOCKED until an API-authenticated hosted run publishes a review**.

For the same SDK adapter locally, set `LLM_API_KEY` and `LLM_MODEL` in your shell, then run `npm run review:local -- --reviewer openhands --pr 123`. Docker supplies the SDK; `--runtime native` uses `.venv-openhands/bin/python` or `--python`. See [local setup](../../docs/LOCAL_RUNS.md); no local publication occurs.

This is the explicitly API-funded candidate. It runs a native `Agent` and `Conversation` in the project's job image, with custom `mcp_config`, no terminal/file-editor tools, a 12-iteration limit and a $2 SDK conversation budget. Provider accounting may differ from the SDK's estimate; set provider-side limits as well. It is not OpenHands Cloud, a nested Docker server, or the experimental subscription ACP reviewer.

```bash
gh secret set LLM_API_KEY
gh variable set OPENHANDS_MODEL --body 'YOUR_PROVIDER/YOUR_MODEL_ID'
gh workflow run review-openhands.yml --ref main -f pr_number=123
```

Replace the model placeholder with an API-provider-supported ID matching the key. No paid model is selected by default. Inference can incur provider API charges. No OSS grant is assumed. No GitHub App is needed; publication has a separate `GITHUB_TOKEN`.

`requirements.in` pins the SDK; `requirements.txt` is the Linux/Python 3.13 hash-locked dependency graph. Regenerate deliberately with `uv pip compile reviewers/openhands/requirements.in --python-version 3.13 --python-platform x86_64-unknown-linux-gnu --generate-hashes --output-file reviewers/openhands/requirements.txt`. The Docker build imports the pinned SDK to detect incompatible dependencies.

Artifacts: `openhands-input-RUN-ATTEMPT`, `openhands-evidence-RUN-ATTEMPT`, `openhands-publication-RUN-ATTEMPT`. [SDK MCP example](https://github.com/OpenHands/software-agent-sdk/blob/main/examples/01_standalone_sdk/07_mcp_integration.py), [PR/ACP constraints](https://github.com/OpenHands/docs/blob/main/openhands/usage/use-cases/code-review.mdx), [root setup](../../README.md).
