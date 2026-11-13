"""Native SDK client in the job container; only the two configured MCP servers."""
import json
import os
import sys
from pathlib import Path

from openhands.sdk import Agent, Conversation, LLM
from openhands.sdk.mcp import MCPServer
from pydantic import SecretStr


def main():
    directory = Path(sys.argv[1]).resolve()
    key = os.environ.get("LLM_API_KEY")
    if not key:
        raise RuntimeError("BLOCKED: AUTH_MISSING — LLM_API_KEY")
    settings = json.loads((directory / "environment.json").read_text())
    servers = json.loads((directory / "mcp.json").read_text())["mcpServers"]
    llm = LLM(model=settings["model"], api_key=SecretStr(key), usage_id="review",
              max_output_tokens=4096)
    agent = Agent(llm=llm, tools=[], mcp_config={name: MCPServer(**config) for name, config in servers.items()})
    # No terminal, browser-agent, file editor, subscription login, or ACP provider.
    with Conversation(agent=agent, workspace=str(directory / "agent-home"), max_iteration_per_run=12,
                      max_budget_per_run=2.0, visualizer=None) as conversation:
        conversation.send_message((directory / "prompt.txt").read_text())
        conversation.run()


if __name__ == "__main__":
    main()
