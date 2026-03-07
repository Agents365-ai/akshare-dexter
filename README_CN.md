# AK-Share Dexter 🤖

[English](README.md)

AK-Share Dexter 是一个自主金融研究智能体，能够自主思考、规划和学习。它通过任务规划、自我反思和实时市场数据进行分析研究。类似于 Claude Code，但专为金融研究打造。支持**美股**、**中国 A 股**（通过 Tushare Pro）和**港股**（即将支持）。

<img width="1098" alt="AK-Share Dexter Banner" src="images/banner.png" />

## 目录

- [👋 概述](#-概述)
- [✅ 环境要求](#-环境要求)
- [💻 安装](#-安装)
- [🚀 运行](#-运行)
- [📊 评测](#-评测)
- [🐛 调试](#-调试)
- [📱 WhatsApp 使用](#-whatsapp-使用)
- [🤝 参与贡献](#-参与贡献)
- [📄 许可证](#-许可证)


## 👋 概述

Dexter 接收复杂的金融问题，将其拆解为清晰的、分步骤的研究计划。它使用实时市场数据执行这些任务，检查自身的工作结果，并不断优化直到得出有数据支撑的可靠答案。

**核心能力：**
- **智能任务规划**：自动将复杂查询分解为结构化的研究步骤
- **自主执行**：选择并调用合适的工具获取金融数据
- **自我验证**：检查自身工作并迭代直到任务完成
- **多市场支持**：美股（Financial Datasets API）、中国 A 股（Tushare Pro）、港股（规划中）
- **A 股数据**：日行情、PE/PB/PS 估值、财务报表、北向资金、融资融券、涨跌停、概念板块
- **实时金融数据**：利润表、资产负债表、现金流量表、关键财务指标
- **多 LLM 支持**：OpenAI、Anthropic、DeepSeek、Google、xAI、Ollama、OpenRouter 等
- **安全特性**：内置循环检测和步骤限制，防止失控执行

<img width="1042" height="638" alt="Screenshot 2026-02-18 at 12 21 25 PM" src="https://github.com/user-attachments/assets/2a6334f9-863f-4bd2-a56f-923e42f4711e" />


## ✅ 环境要求

- [Bun](https://bun.com) 运行时（v1.0 或更高版本）
- 至少一个 LLM API 密钥（见下表）

**LLM 提供商**（至少选一个）：

| 提供商 | 环境变量 | 说明 |
|--------|---------|------|
| DeepSeek | `DEEPSEEK_API_KEY` | 推荐用于中国市场研究 |
| OpenAI | `OPENAI_API_KEY` | GPT-4o、o1-mini |
| Anthropic | `ANTHROPIC_API_KEY` | Claude 系列 |
| Google | `GOOGLE_API_KEY` | Gemini 系列 |
| Ollama | `OLLAMA_BASE_URL` | 本地 LLM，免费 |

**数据源**（可选，启用对应市场工具）：

| 数据源 | 环境变量 | 市场 | 获取密钥 |
|--------|---------|------|---------|
| Tushare Pro | `TUSHARE_TOKEN` | 中国 A 股 | [tushare.pro](https://tushare.pro) |
| Financial Datasets | `FINANCIAL_DATASETS_API_KEY` | 美股 | [financialdatasets.ai](https://financialdatasets.ai) |
| Exa | `EXASEARCH_API_KEY` | 网页搜索 | [exa.ai](https://exa.ai) |

#### 安装 Bun

如果你还没有安装 Bun，可以使用 curl 安装：

**macOS/Linux：**
```bash
curl -fsSL https://bun.com/install | bash
```

**Windows：**
```bash
powershell -c "irm bun.sh/install.ps1|iex"
```

安装完成后，重启终端并验证：
```bash
bun --version
```

## 💻 安装

1. 克隆仓库：
```bash
git clone https://github.com/Agents365-ai/akshare-dexter.git
cd akshare-dexter
```

2. 使用 Bun 安装依赖：
```bash
bun install
```

3. 配置环境变量：
```bash
# 复制示例环境变量文件
cp env.example .env

# 编辑 .env 并添加你的 API 密钥

# === LLM 提供商（至少配置一个） ===
# DEEPSEEK_API_KEY=your-deepseek-api-key
# OPENAI_API_KEY=your-openai-api-key
# ANTHROPIC_API_KEY=your-anthropic-api-key
# OLLAMA_BASE_URL=http://127.0.0.1:11434

# === 中国 A 股数据（Tushare Pro） ===
# TUSHARE_TOKEN=your-tushare-token

# === 美股数据 ===
# FINANCIAL_DATASETS_API_KEY=your-financial-datasets-api-key

# === 网页搜索（可选） ===
# EXASEARCH_API_KEY=your-exa-api-key
# TAVILY_API_KEY=your-tavily-api-key
```

## 🚀 运行

交互模式运行：
```bash
bun start
```

开发模式（文件监听）：
```bash
bun dev
```

## 📊 评测

Dexter 包含评测套件，使用金融问题数据集测试智能体。评测使用 LangSmith 进行追踪，采用 LLM-as-judge 方式评分。

**运行全部问题：**
```bash
bun run src/evals/run.ts
```

**随机抽样运行：**
```bash
bun run src/evals/run.ts --sample 10
```

评测运行器实时显示进度、当前问题和准确率统计。结果记录到 LangSmith 进行分析。

## 🐛 调试

Dexter 将所有工具调用记录到 scratchpad 文件中，用于调试和历史追踪。每个查询创建一个新的 JSONL 文件，保存在 `.dexter/scratchpad/` 目录下。

**Scratchpad 位置：**
```
.dexter/scratchpad/
├── 2026-01-30-111400_9a8f10723f79.jsonl
├── 2026-01-30-143022_a1b2c3d4e5f6.jsonl
└── ...
```

每个文件包含换行分隔的 JSON 条目，记录：
- **init**：原始查询
- **tool_result**：每次工具调用的参数、原始结果和 LLM 摘要
- **thinking**：智能体推理步骤

**示例条目：**
```json
{"type":"tool_result","timestamp":"2026-01-30T11:14:05.123Z","toolName":"get_income_statements","args":{"ticker":"AAPL","period":"annual","limit":5},"result":{...},"llmSummary":"获取了苹果5年年度利润表，显示营收从2740亿增长至3940亿"}
```

可以方便地查看智能体收集了哪些数据以及如何解读结果。

## 📱 WhatsApp 使用

通过 WhatsApp 与 Dexter 聊天。将手机链接到 gateway 后，发送给自己的消息会由 Dexter 处理并回复到同一聊天。

**快速开始：**
```bash
# 链接 WhatsApp 账号（扫描二维码）
bun run gateway:login

# 启动 gateway
bun run gateway
```

然后打开 WhatsApp，进入自己的聊天（给自己发消息），向 Dexter 提问即可。

详细的设置说明、配置选项和故障排查，请参阅 [WhatsApp Gateway README](src/gateway/channels/whatsapp/README.md)。

## 🤝 参与贡献

1. Fork 本仓库
2. 创建功能分支
3. 提交更改
4. 推送分支
5. 创建 Pull Request

**注意**：请保持 Pull Request 小而专注，这样更便于审查和合并。


## 📄 许可证

本项目采用 [Apache License 2.0](LICENSE) 许可证。

## 支持

如果本项目对你有帮助，欢迎支持作者：

<table>
  <tr>
    <td align="center">
      <img src="https://raw.githubusercontent.com/Agents365-ai/images_payment/main/qrcode/wechat-pay.png" width="180" alt="微信支付">
      <br>
      <b>微信支付</b>
    </td>
    <td align="center">
      <img src="https://raw.githubusercontent.com/Agents365-ai/images_payment/main/qrcode/alipay.png" width="180" alt="支付宝">
      <br>
      <b>支付宝</b>
    </td>
    <td align="center">
      <img src="https://raw.githubusercontent.com/Agents365-ai/images_payment/main/qrcode/buymeacoffee.png" width="180" alt="Buy Me a Coffee">
      <br>
      <b>Buy Me a Coffee</b>
    </td>
  </tr>
</table>

## 作者

**Agents365-ai**

- Bilibili: https://space.bilibili.com/1107534197
- GitHub: https://github.com/Agents365-ai
