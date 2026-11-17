# Hosted Codex

**Codex Cloud is excluded from the demo.** OpenAI’s hosted GitHub reviewer runs in the managed `universal` image. Its setup scripts can install tools, but the demo requires the reviewer and Serena to run inside the project’s existing image. The hosted review environment offers no documented custom base image or Docker-in-Docker option. [Hosted review environment](https://learn.chatgpt.com/docs/environments/cloud-environment#default-universal-image) · [OpenAI Support on nested containers](https://community.openai.com/t/codex-docker-in-docker-in-environment-setup/1272369/22)

GitHub’s managed Codex partner agent and the gh-aw integration were evaluated separately. [Discarded routes and reasons](../../docs/DISCARDED.md) · [gh-aw image experiment](../github-aw/README.md)
