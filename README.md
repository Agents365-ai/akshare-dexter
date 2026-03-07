# AK-Share Dexter 🤖

[中文文档](README_CN.md)

AK-Share Dexter is an autonomous financial research agent that thinks, plans, and learns as it works. It performs analysis using task planning, self-reflection, and real-time market data. Think Claude Code, but built specifically for financial research. Supports **US stocks**, **Chinese A-shares** (via Tushare Pro), and **Hong Kong stocks** (coming soon).

<img width="1098" alt="AK-Share Dexter Banner" src="images/banner.png" />

## Table of Contents

- [👋 Overview](#-overview)
- [✅ Prerequisites](#-prerequisites)
- [💻 How to Install](#-how-to-install)
- [🚀 How to Run](#-how-to-run)
- [📊 How to Evaluate](#-how-to-evaluate)
- [🐛 How to Debug](#-how-to-debug)
- [📱 How to Use with WhatsApp](#-how-to-use-with-whatsapp)
- [🤝 How to Contribute](#-how-to-contribute)
- [📄 License](#-license)


## 👋 Overview

Dexter takes complex financial questions and turns them into clear, step-by-step research plans. It runs those tasks using live market data, checks its own work, and refines the results until it has a confident, data-backed answer.  

**Key Capabilities:**
- **Intelligent Task Planning**: Automatically decomposes complex queries into structured research steps
- **Autonomous Execution**: Selects and executes the right tools to gather financial data
- **Self-Validation**: Checks its own work and iterates until tasks are complete
- **Multi-Market Support**: US stocks (Financial Datasets API), Chinese A-shares (Tushare Pro), Hong Kong stocks (planned)
- **A-Share Data**: Daily quotes, PE/PB/PS valuation, financial statements, northbound flows, margin data, limit up/down, concept sectors
- **Real-Time Financial Data**: Income statements, balance sheets, cash flow statements, and key financial indicators
- **Multiple LLM Providers**: OpenAI, Anthropic, DeepSeek, Google, xAI, Ollama, OpenRouter, and more
- **Safety Features**: Built-in loop detection and step limits to prevent runaway execution

<img width="1042" height="638" alt="Screenshot 2026-02-18 at 12 21 25 PM" src="https://github.com/user-attachments/assets/2a6334f9-863f-4bd2-a56f-923e42f4711e" />


## ✅ Prerequisites

- [Bun](https://bun.com) runtime (v1.0 or higher)
- At least one LLM API key (see table below)

**LLM Providers** (choose one or more):

| Provider | Env Variable | Notes |
|----------|-------------|-------|
| DeepSeek | `DEEPSEEK_API_KEY` | Recommended for Chinese market research |
| OpenAI | `OPENAI_API_KEY` | GPT-4o, o1-mini |
| Anthropic | `ANTHROPIC_API_KEY` | Claude series |
| Google | `GOOGLE_API_KEY` | Gemini series |
| Ollama | `OLLAMA_BASE_URL` | Local LLM, free |

**Data Sources** (optional, enables market-specific tools):

| Source | Env Variable | Market | Get Key |
|--------|-------------|--------|---------|
| Tushare Pro | `TUSHARE_TOKEN` | Chinese A-shares | [tushare.pro](https://tushare.pro) |
| Financial Datasets | `FINANCIAL_DATASETS_API_KEY` | US stocks | [financialdatasets.ai](https://financialdatasets.ai) |
| Exa | `EXASEARCH_API_KEY` | Web search | [exa.ai](https://exa.ai) |

#### Installing Bun

If you don't have Bun installed, you can install it using curl:

**macOS/Linux:**
```bash
curl -fsSL https://bun.com/install | bash
```

**Windows:**
```bash
powershell -c "irm bun.sh/install.ps1|iex"
```

After installation, restart your terminal and verify Bun is installed:
```bash
bun --version
```

## 💻 How to Install

1. Clone the repository:
```bash
git clone https://github.com/Agents365-ai/akshare-dexter.git
cd akshare-dexter
```

2. Install dependencies with Bun:
```bash
bun install
```

3. Set up your environment variables:
```bash
# Copy the example environment file
cp env.example .env

# Edit .env and add your API keys

# === LLM Provider (at least one required) ===
# DEEPSEEK_API_KEY=your-deepseek-api-key
# OPENAI_API_KEY=your-openai-api-key
# ANTHROPIC_API_KEY=your-anthropic-api-key
# OLLAMA_BASE_URL=http://127.0.0.1:11434

# === Chinese A-Share Market (Tushare Pro) ===
# TUSHARE_TOKEN=your-tushare-token

# === US Stock Market ===
# FINANCIAL_DATASETS_API_KEY=your-financial-datasets-api-key

# === Web Search (optional) ===
# EXASEARCH_API_KEY=your-exa-api-key
# TAVILY_API_KEY=your-tavily-api-key
```

## 🚀 How to Run

Run Dexter in interactive mode:
```bash
bun start
```

Or with watch mode for development:
```bash
bun dev
```

## 📊 How to Evaluate

Dexter includes an evaluation suite that tests the agent against a dataset of financial questions. Evals use LangSmith for tracking and an LLM-as-judge approach for scoring correctness.

**Run on all questions:**
```bash
bun run src/evals/run.ts
```

**Run on a random sample of data:**
```bash
bun run src/evals/run.ts --sample 10
```

The eval runner displays a real-time UI showing progress, current question, and running accuracy statistics. Results are logged to LangSmith for analysis.

## 🐛 How to Debug

Dexter logs all tool calls to a scratchpad file for debugging and history tracking. Each query creates a new JSONL file in `.dexter/scratchpad/`.

**Scratchpad location:**
```
.dexter/scratchpad/
├── 2026-01-30-111400_9a8f10723f79.jsonl
├── 2026-01-30-143022_a1b2c3d4e5f6.jsonl
└── ...
```

Each file contains newline-delimited JSON entries tracking:
- **init**: The original query
- **tool_result**: Each tool call with arguments, raw result, and LLM summary
- **thinking**: Agent reasoning steps

**Example scratchpad entry:**
```json
{"type":"tool_result","timestamp":"2026-01-30T11:14:05.123Z","toolName":"get_income_statements","args":{"ticker":"AAPL","period":"annual","limit":5},"result":{...},"llmSummary":"Retrieved 5 years of Apple annual income statements showing revenue growth from $274B to $394B"}
```

This makes it easy to inspect exactly what data the agent gathered and how it interpreted results.

## 📱 How to Use with WhatsApp

Chat with Dexter through WhatsApp by linking your phone to the gateway. Messages you send to yourself are processed by Dexter and responses are sent back to the same chat.

**Quick start:**
```bash
# Link your WhatsApp account (scan QR code)
bun run gateway:login

# Start the gateway
bun run gateway
```

Then open WhatsApp, go to your own chat (message yourself), and ask Dexter a question.

For detailed setup instructions, configuration options, and troubleshooting, see the [WhatsApp Gateway README](src/gateway/channels/whatsapp/README.md).

## 🔌 MCP Server (OpenClaw / Claude Desktop)

Dexter exposes its financial research tools via [MCP (Model Context Protocol)](https://modelcontextprotocol.io/), enabling integration with OpenClaw, Claude Desktop, and other MCP clients.

**Start the MCP server:**
```bash
bun run mcp
```

**Available MCP tools:**

| Tool | Description |
|------|-------------|
| `financial_search` | US stock prices, financials, metrics, news |
| `financial_metrics` | Fundamental analysis (income, balance sheet, cash flow) |
| `read_filings` | SEC filing content (10-K, 10-Q, 8-K) |
| `cn_market_search` | Chinese A-share data (requires `TUSHARE_TOKEN`) |
| `web_search` | Web search (requires `EXASEARCH_API_KEY` or alternatives) |
| `web_fetch` | Fetch and extract web page content |
| `x_search` | X/Twitter sentiment search (requires `X_BEARER_TOKEN`) |

**OpenClaw configuration** (`~/.openclaw/openclaw.json`):
```json
{
  "mcpServers": {
    "akshare-dexter": {
      "command": "bun",
      "args": ["run", "src/mcp-server.ts"],
      "cwd": "/path/to/akshare-dexter"
    }
  }
}
```

**Claude Desktop configuration** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "akshare-dexter": {
      "command": "bun",
      "args": ["run", "src/mcp-server.ts"],
      "cwd": "/path/to/akshare-dexter"
    }
  }
}
```

Meta-tools (`financial_search`, `cn_market_search`) use an LLM internally for routing. Set `DEFAULT_MODEL` env var (default: `deepseek-chat`).

## 🤝 How to Contribute

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

**Important**: Please keep your pull requests small and focused.  This will make it easier to review and merge.


## 📄 License

This project is licensed under the [Apache License 2.0](LICENSE).

## Support

If this project helps you, consider supporting the author:

<table>
  <tr>
    <td align="center">
      <img src="https://raw.githubusercontent.com/Agents365-ai/images_payment/main/qrcode/wechat-pay.png" width="180" alt="WeChat Pay">
      <br>
      <b>WeChat Pay</b>
    </td>
    <td align="center">
      <img src="https://raw.githubusercontent.com/Agents365-ai/images_payment/main/qrcode/alipay.png" width="180" alt="Alipay">
      <br>
      <b>Alipay</b>
    </td>
    <td align="center">
      <img src="https://raw.githubusercontent.com/Agents365-ai/images_payment/main/qrcode/buymeacoffee.png" width="180" alt="Buy Me a Coffee">
      <br>
      <b>Buy Me a Coffee</b>
    </td>
  </tr>
</table>

## Author

**Agents365-ai**

- Bilibili: https://space.bilibili.com/1107534197
- GitHub: https://github.com/Agents365-ai
