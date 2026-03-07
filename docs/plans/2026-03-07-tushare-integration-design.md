# Tushare A-Share Integration Design

**Date**: 2026-03-07
**Status**: Approved
**Scope**: Phase 1 — A-shares only, direct HTTP, mirror architecture

## Context

AkShare Dexter is an autonomous financial research agent currently supporting US markets via Financial Datasets API. This design adds Chinese A-share support using Tushare Pro (tushare.pro) as the data source.

## Decisions

- **Data source**: Tushare Pro REST API (POST http://api.tushare.pro)
- **Integration method**: Direct HTTP from TypeScript (no Python dependency)
- **Architecture**: Mirror pattern — independent `src/tools/tushare/` directory
- **Coexistence**: US tools preserved, A-share tools added alongside
- **Market scope**: A-shares only (Phase 1), HK stocks in future phase
- **Tushare points**: 2000+ (full access to daily_basic, northbound flows, concepts)
- **Auth**: Single `TUSHARE_TOKEN` environment variable

## Architecture

```
src/tools/tushare/
├── api.ts              # Tushare REST API communication layer
├── types.ts            # Shared types and formatToolResult
├── stock-price.ts      # Daily quotes + valuation metrics
├── fundamentals.ts     # Income, balance sheet, cashflow, fina_indicator
├── market-ref.ts       # Northbound flows, margin, block trades, limit list
├── concept.ts          # Concept/theme sectors and constituents
├── news.ts             # Financial news and company announcements
├── stock-info.ts       # Stock list, trade calendar
├── cn-market-search.ts # Meta-tool: LLM-routed Chinese market search
└── index.ts            # Re-exports all tools
```

## API Communication Layer (api.ts)

```typescript
export async function callTushare(
  apiName: string,
  params: Record<string, string | number | undefined>,
  fields?: string[],
  options?: { cacheable?: boolean }
): Promise<{ data: Record<string, any>[]; url: string }>
```

- Reads `TUSHARE_TOKEN` from env
- POST to `http://api.tushare.pro` with JSON body: `{ api_name, token, params, fields }`
- Transforms tabular response `{ fields: [...], items: [[...]] }` into object array
- Error handling: code `2002` → permission error, `-2001` → field validation
- Caching: historical data cacheable, current data not
- URL returned as `tushare://api_name?param=value` for source tracking

## Tool Inventory

### stock-price.ts
| Tool | API | Description |
|------|-----|-------------|
| `get_cn_stock_price` | `daily` | Single stock daily OHLCV (latest or specific date) |
| `get_cn_stock_prices` | `daily` | Historical price range for a stock |
| `get_cn_stock_basic` | `daily_basic` | PE/PB/PS/turnover/market cap on a date |

### fundamentals.ts
| Tool | API | Description |
|------|-----|-------------|
| `get_cn_income` | `income` | Income statement (annual/quarterly) |
| `get_cn_balance_sheet` | `balancesheet` | Balance sheet |
| `get_cn_cashflow` | `cashflow` | Cash flow statement |
| `get_cn_fina_indicator` | `fina_indicator` | ROE, ROA, gross margin, net margin, etc. |

### market-ref.ts
| Tool | API | Description |
|------|-----|-------------|
| `get_northbound_flow` | `moneyflow_hsgt` | Daily northbound/southbound capital flows |
| `get_margin_data` | `margin` | Margin trading aggregate data |
| `get_block_trade` | `block_trade` | Block trade records |
| `get_limit_list` | `stk_limit` | Limit up/down stock list |

### concept.ts
| Tool | API | Description |
|------|-----|-------------|
| `get_concept_list` | `concept` | All concept/theme sector names |
| `get_concept_stocks` | `concept_detail` | Stocks in a concept sector |

### news.ts
| Tool | API | Description |
|------|-----|-------------|
| `get_cn_news` | `major_news` | Financial news from major sources |
| `get_cn_announcements` | `anns` | Company announcements/filings |

### stock-info.ts
| Tool | API | Description |
|------|-----|-------------|
| `get_cn_stock_list` | `stock_basic` | Listed stock directory with industry/area |
| `get_trade_calendar` | `trade_cal` | Trading calendar (open/close days) |

## Meta-Tool: cn_market_search

Factory function `createCnMarketSearch(model)` creates an LLM-routed meta-tool:

- Input: natural language query (Chinese or English)
- LLM selects and calls appropriate atomic tools
- Handles ticker resolution: "茅台" → `600519.SH`, "宁德时代" → `300750.SZ`
- Combines results with source URLs
- Progress callbacks for CLI display

## Registry Integration

In `src/tools/registry.ts`:

```typescript
if (process.env.TUSHARE_TOKEN) {
  tools.push({
    name: 'cn_market_search',
    tool: createCnMarketSearch(model),
    description: CN_MARKET_SEARCH_DESCRIPTION,
  });
}
```

Conditional on `TUSHARE_TOKEN` — if not set, A-share tools are not loaded.

## A-Share Specific Handling

- **Ticker format**: `{code}.{exchange}` — `000001.SZ` (Shenzhen), `600519.SH` (Shanghai), `830799.BJ` (BSE)
- **Date format**: `YYYYMMDD` (no hyphens), Tushare convention
- **Limit up/down**: A-share specific (10% main board, 20% ChiNext/STAR, 30% BSE)
- **Reporting periods**: Q1 (0331), H1 (0630), Q3 (0930), Annual (1231)
- **Field selection**: Request only needed fields to minimize token usage
- **Chinese company names**: Tools should handle both Chinese names and ticker codes

## Environment Variables

```
TUSHARE_TOKEN=your_tushare_pro_token
```

Added to `env.example` alongside existing variables.

## Token Optimization

- Strip redundant fields from Tushare responses (e.g., `update_flag`, `ann_date` when not needed)
- Request specific `fields` parameter to limit response columns
- Cache historical data (past trading days, past financial statements)

## Out of Scope (Phase 1)

- Hong Kong stocks (hk_basic, hk_daily)
- Index data (index_daily, index_weight)
- Fund data (fund_basic, fund_nav)
- Futures/options
- Convertible bonds
- Macro data (CPI, GDP, SHIBOR)
- Chinese SOUL.md / investment philosophy
- WeChat/DingTalk gateway
- Domestic LLM integration (DeepSeek/Qwen)
