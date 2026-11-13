# Scripted local integration client

Used only by `npm run demo:local` and the image build. Calls real Serena and project MCP tools, runs unit/Chromium checks against an isolated regression, and tests receipt submission without using a model or posting to GitHub. Its handcrafted finding is test data, never AI review evidence. A successful run records `LOCAL_PROTOCOL_VERIFIED`, not PASS.

See [local setup](../../README.md#local-preview-and-verification).
