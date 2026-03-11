# AK-Share Dexter 🤖 — 自主金融研究智能体

[English](README_EN.md)

> 像 Claude Code 一样思考和行动，但专为金融研究打造。支持美股、A 股、港股三大市场。

<img width="1098" alt="AK-Share Dexter Banner" src="images/banner.png" />

## 🆓 免费使用

通过 **QQ/飞书** 即可免费使用 AKShare Dexter 的全部金融研究能力。

**关注 [Bilibili](https://space.bilibili.com/1107534197) → 使用QQBOT/加入飞书群组 → 加入即可使用，无需安装任何软件。**

---

## 🎯 它能做什么

直接用自然语言提问，AKShare Dexter 自动规划研究步骤、调用数据工具、验证结果、生成完整报告。

| 问题示例 | AKShare Dexter 做了什么 |
|----------|----------------|
| 分析腾讯 2024 年财务表现 | 拉取港股利润表、资产负债表、现金流、财务指标，横向对比后生成分析报告 |
| 比较茅台和五粮液的估值 | 获取两只股票的 PE/PB/PS、市值、营收增长，输出对比表格和投资观点 |
| Apple revenue trend last 3 years | Pulls income statements, computes YoY growth, charts the trend |
| 最近北向资金流入了哪些股票 | 查询沪深港通资金流向和持股变动，识别资金重点流入标的 |
| 比亚迪 vs 特斯拉 投资价值 | 跨市场调取两家公司财务数据、估值指标、行业趋势，生成对比研究报告 |

## ⚡ 核心能力

- **智能任务规划** — 自动将复杂问题拆解为多步研究计划
- **自主执行** — 选择合适的工具获取数据，无需人工干预
- **自我验证** — 检查结果、发现不足、自动补充研究
- **三大市场覆盖** — 美股、A 股、港股实时数据
- **多模型支持** — OpenAI、Anthropic、DeepSeek、Google、Ollama 等
- **安全机制** — 内置循环检测和步骤限制，防止失控执行

## 🔄 工作原理

```
用户提问 → 规划研究步骤 → 调用数据工具 → 自我验证 → 生成研究报告
```

AKShare Dexter 不是简单的问答。它像一个真正的研究员：先制定计划，再逐步执行，遇到问题会回头补充数据，直到给出有数据支撑的完整答案。

## 📊 数据覆盖

### A 股 & 港股（Tushare Pro）

| 类别 | 说明 | API |
|------|------|-----|
| 基础数据 | A 股和港股股票列表、交易日历 | `stock_basic`、`hk_basic`、`trade_cal` |
| 低频行情 | A 股和港股日线、周线、月线 OHLCV | `daily`、`hk_daily` |
| 估值指标 | PE、PB、PS、总市值、换手率 | `daily_basic` |
| 财务数据 | A 股三大报表 | `income`、`balancesheet`、`cashflow` |
| 财务指标 | ROE、ROA、毛利率、净利率、增长率 | `fina_indicator` |
| 港股财务 | 港股利润表、资产负债表、现金流、财务指标 | `hk_income`、`hk_balancesheet`、`hk_cashflow`、`hk_fina_indicator` |
| 沪深港通持股 | 跨境持股数据（港股通/沪股通） | `hk_hold` |
| 资金流向 | 北向资金/南向资金 | `moneyflow_hsgt` |
| 融资融券 | 融资融券余额和交易数据 | `margin` |
| 大宗交易 | 大宗交易记录 | `block_trade` |
| 涨跌停 | 每日涨跌停股票列表 | `stk_limit` |
| 概念板块 | 概念/题材板块及成分股 | `concept`、`concept_detail` |
| 新闻资讯 | 重大财经新闻 | `major_news` |

### 美股（Financial Datasets API）

股价行情、利润表、资产负债表、现金流量表、关键财务指标、SEC 文件（10-K、10-Q、8-K）

---

## 🔌 MCP Server

AKShare Dexter 可作为 MCP (Model Context Protocol) 服务运行，接入 OpenClaw、Claude Code、Cursor 等任何 MCP 客户端。

对外只暴露一个 `research` 工具 —— 接收自然语言查询，内部自动完成多步规划、工具调用、数据验证、报告生成。支持通过 `session_id` 实现多轮对话。

### stdio（本地）

```bash
bun run mcp
```

在 MCP 客户端中配置（例如 OpenClaw 的 `openclaw.json`）：

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

### HTTP（远程部署）

```bash
MCP_HTTP_PORT=3100 bun run mcp:http
```

---

<img width="1042" height="638" alt="AKShare Dexter Screenshot" src="https://github.com/user-attachments/assets/2a6334f9-863f-4bd2-a56f-923e42f4711e" />

---

## 支持作者

如果 AKShare Dexter 对你有帮助，欢迎支持：

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

## 📄 许可证

[Apache License 2.0](LICENSE)
