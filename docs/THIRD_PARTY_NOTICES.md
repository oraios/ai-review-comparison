# Bundled tool sources

The image contains third-party programs with their own licenses and notices. Their upstream repositories and installed distributions are the authoritative sources.

| Component | Source / provenance |
| --- | --- |
| Serena | [Pinned source](https://github.com/oraios/serena/tree/6e5c3776d4e67befaab7c290bc29b0279c98d1ed), including its license files, retained at `/opt/serena-source`. Serena application: GPL-3.0-or-later; SolidLSP component: MIT, as described in upstream LICENSE. |
| Playwright / bundled browsers | [Playwright](https://github.com/microsoft/playwright), official MCR image pinned in Dockerfile; browser notices remain in installed distributions. |
| MCP TypeScript SDK | [Source](https://github.com/modelcontextprotocol/typescript-sdk), version/integrity in package-lock.json. |
| Claude Code | [CLI documentation](https://code.claude.com/docs/en/overview), pinned npm distribution in image/agents/package-lock.json. |
| Copilot CLI | [Source and distribution](https://github.com/github/copilot-cli), pinned npm distribution in image/agents/package-lock.json. |
| OpenCode | [Pinned source](https://github.com/anomalyco/opencode/tree/v1.19.5), npm distribution and integrity in image/agents/package-lock.json. |
| GitHub Agentic Workflows | [Compiler v1.2.2](https://github.com/github/gh-aw/releases/tag/v1.2.2); generated workflow references separately pinned framework actions and infrastructure images. |
| OpenHands SDK | [Source](https://github.com/OpenHands/software-agent-sdk), requirements pinned and hash-locked. |
| Bun / uv | [Bun](https://github.com/oven-sh/bun), [uv](https://github.com/astral-sh/uv); versions pinned in the image inputs. |

No vendor endorsement, free inference entitlement or transferable subscription is implied by including a tool in the image.
