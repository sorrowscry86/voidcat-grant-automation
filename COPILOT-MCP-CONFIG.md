# Copilot Coding Agent MCP Configuration (Notion)

This repository uses GitHub Copilot coding agent. You can extend it with a Notion MCP server without adding any workflows.

Follow these steps as a repository admin.

## 1) Paste MCP configuration JSON

- GitHub → this repo → Settings → Copilot → Coding agent → MCP configuration
- Paste the JSON below and Save

```json
{
  "mcpServers": {
    "notionApi": {
      "type": "local",
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "-e",
        "OPENAPI_MCP_HEADERS={\"Authorization\": \"Bearer $NOTION_API_KEY\", \"Notion-Version\": \"2022-06-28\"}",
        "mcp/notion"
      ],
      "env": {
        "NOTION_API_KEY": "COPILOT_MCP_NOTION_API_KEY"
      },
      "tools": ["*"]
    }
  }
}
```

Notes

- `tools`: Using `"*"` enables all tools from the Notion server. You can replace this with an allowlist once you know the exact tool names you want to expose.
- The example uses Docker to run the Notion MCP server; Docker is available on GitHub’s Ubuntu-hosted runners and requires no extra workflow for this setup.

## 2) Add the Copilot environment secret

- GitHub → this repo → Settings → Environments → New environment → name it `copilot`
- Open the `copilot` environment → Add environment secret
  - Name: `COPILOT_MCP_NOTION_API_KEY`
  - Value: your Notion integration secret (starts with `secret_...`)

Only secrets prefixed with `COPILOT_MCP_` are available to MCP servers.

## 3) Validate the configuration

- Create an issue and assign it to Copilot
- Wait for the “Copilot started work” event in the PR created by Copilot
- Click “View session” → in the log viewer, open the Copilot panel → expand “Start MCP Servers”
- You should see the Notion MCP server listed with its tools

## Troubleshooting

- Syntax errors in the JSON will be shown inline when saving the MCP configuration in Settings → Copilot → Coding agent
- If the server fails to start, confirm the secret is added under the `copilot` environment and the name matches exactly: `COPILOT_MCP_NOTION_API_KEY`
- If you prefer a narrower tool surface, replace `"tools": ["*"]` with a specific allowlist once you know the tool IDs from the Notion MCP server

## References

- GitHub Docs: Extending Copilot coding agent with MCP — <https://docs.github.com/en/enterprise-cloud@latest/copilot/how-tos/use-copilot-agents/coding-agent/extend-coding-agent-with-mcp>
- Notion MCP server — <https://github.com/makenotion/notion-mcp-server>
