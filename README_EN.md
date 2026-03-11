# AK-Share Dexter 🤖 — Autonomous Financial Research Agent

[中文](README.md)

An autonomous financial research agent that thinks, plans, and learns as it works. Like Claude Code, but built for financial research. Supports **US stocks**, **Chinese A-shares**, and **Hong Kong stocks**.

<img width="1098" alt="AK-Share Dexter Banner" src="images/banner.png" />

## Free Access

Use AKShare Dexter for free via **QQ/Feishu + OpenClaw** — no installation required.

See the [Chinese README](README.md) for details on how to join.

## Key Capabilities

- **Task Planning** — Automatically breaks down complex questions into research steps
- **Autonomous Execution** — Selects tools, gathers data, no manual intervention
- **Self-Validation** — Checks results, fills gaps, iterates until complete
- **3 Markets** — US stocks, Chinese A-shares, Hong Kong stocks with real-time data
- **Multi-Model** — OpenAI, Anthropic, DeepSeek, Google, Ollama, and more

## Example Queries

- "Analyze Tencent's 2024 financial performance"
- "Compare Moutai vs Wuliangye valuation"
- "Apple revenue trend last 3 years"
- "Recent northbound capital inflows — which stocks?"
- "BYD vs Tesla investment thesis"

## MCP Server

AKShare Dexter runs as an MCP (Model Context Protocol) server, integrating with OpenClaw, Claude Code, Cursor, and any MCP-compatible client.

It exposes a single `research` tool — accepts natural language queries, runs the full agent loop internally (planning, tool calling, validation, report generation). Supports multi-turn conversations via `session_id`.

### stdio (local)

```bash
bun run mcp
```

Configure in your MCP client (e.g. OpenClaw `openclaw.json`):

```json
{
  "mcpServers": {
    "akshare-dexter": {
      "command": "bun",
      "args": ["run", "mcp"],
      "cwd": "/path/to/akshare-dexter"
    }
  }
}
```

### HTTP (remote deployment)

```bash
MCP_HTTP_PORT=3100 bun run mcp:http
```

## Screenshot

<img width="1042" height="638" alt="AKShare Dexter Screenshot" src="https://github.com/user-attachments/assets/2a6334f9-863f-4bd2-a56f-923e42f4711e" />

## Author

**Agents365-ai** — [GitHub](https://github.com/Agents365-ai) · [Bilibili](https://space.bilibili.com/1107534197)

## License

[Apache License 2.0](LICENSE)
