# goose + Claude ACP — BLOCKED: SUBSCRIPTION_CI

There is **no runnable workflow**. This gate means the headless route has not been authenticated and tested, not that the documentation forbids Claude subscription use.

The intended setup is `GOOSE_PROVIDER=claude-acp`, pinned `@agentclientprotocol/claude-agent-acp`, an authenticated Claude subscription and project/Serena extensions forwarded through ACP as MCP servers. The existing goose CI example uses provider API credentials; that variant is excluded for this candidate. ChatGPT saved-account auth is also excluded.

Before implementing `review-goose.yml`, establish that an authorized `CLAUDE_CODE_OAUTH_TOKEN` reaches the ACP adapter without account-file copying; verify headless operation, bounded permissions, extension forwarding and the actual returned Serena/context/check receipts. Then use the same main image, validated PR input and isolated publisher. The proposed prompt/config/MCP template and `.disabled` design record capture that contract but are not a native goose config or enabled integration.

[ACP/subscription guide](https://github.com/aaif-goose/goose/blob/main/documentation/docs/guides/acp-providers.md), [CI recipe](https://github.com/aaif-goose/goose/blob/main/documentation/docs/tutorials/cicd.md), [auth matrix](../../docs/AUTH_MATRIX.md).
