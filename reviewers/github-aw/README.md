# gh-aw with Codex — rejected for single-container reviews

**The custom image works. Serena placement is the reason for rejection.** Standalone Codex can launch Serena with `uvx` over stdio inside a project container. GitHub Agentic Workflows v1.2.2 owns Codex’s MCP connections. Its compiler rejects a native `mcp_servers.serena.command` override. Setting `command: uvx` in gh-aw tells the gateway to launch Serena. Adding uv to the agent image does not move the server there. [Codex configuration in gh-aw](https://github.github.io/gh-aw/reference/engines/codex/#custom-codex-configuration)

The demo has no gh-aw reviewer label, comment command or setup secret. The retained providers launch Serena directly in their job container. [Provider comparison](../../README.md)

## Custom-image experiment

The second Dockerfile preserves the image experiment independently of reviewer setup.

1. Docker Bake passes the demo image as `BASE_IMAGE` to the upstream AWF Dockerfile pinned to v0.29.11. That adds the firewall entrypoint, trust setup, privilege handling and token library. [Bake definition](../../docker-bake.hcl) · [Upstream Dockerfile](https://github.com/github/gh-aw-firewall/blob/v0.29.11/containers/agent/Dockerfile)
2. AWF runs the agent inside a chroot at `/host`. Its runner mounts cover system directories such as `/usr` and `/opt`. The second Dockerfile places the project’s Node binary, required library and demo code under `/host/review-demo`. The agent sees `/review-demo/check`. [Dockerfile](../../Dockerfile.gh-aw) · [Agent check](../../image/check-agent.sh) · [AWF mount layout](https://github.com/github/gh-aw-firewall/blob/v0.29.11/docs/chroot-mode.md)
3. The main-branch image experiment publishes `review-env-awf` to the repository’s GHCR namespace. It compiles a sample gh-aw configuration with the published image digests and exercises the agent check through the actual firewall without inference. The compiled example is an Actions artifact. [Image workflow](../../.github/workflows/build-aw-image.yml) · [Example source](workflow.md.in)

For a local build, run `docker buildx bake gh-aw --load`. The default base is the previously published demo image. GitHub uses the image for the selected main revision.
