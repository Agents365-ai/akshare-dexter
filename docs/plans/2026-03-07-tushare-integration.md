# Tushare A-Share Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Chinese A-share market data tools powered by Tushare Pro REST API, coexisting with existing US market tools.

**Architecture:** Independent `src/tools/tushare/` directory mirroring the `src/tools/finance/` pattern. Tushare REST API called directly via TypeScript fetch (POST http://api.tushare.pro). Tools conditionally loaded when `TUSHARE_TOKEN` env var is set.

**Tech Stack:** TypeScript, Zod, LangChain DynamicStructuredTool, Bun test runner

---

### Task 1: Tushare API Communication Layer

**Files:**
- Create: `src/tools/tushare/api.ts`
- Test: `src/tools/tushare/api.test.ts`

**Step 1: Write the failing test**

```typescript
// src/tools/tushare/api.test.ts
import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { transformTushareResponse } from './api.js';

describe('transformTushareResponse', () => {
  test('converts tabular response to object array', () => {
    const raw = {
      fields: ['ts_code', 'trade_date', 'close'],
      items: [
        ['000001.SZ', '20240101', 10.5],
        ['000001.SZ', '20240102', 10.8],
      ],
    };
    const result = transformTushareResponse(raw);
    expect(result).toEqual([
      { ts_code: '000001.SZ', trade_date: '20240101', close: 10.5 },
      { ts_code: '000001.SZ', trade_date: '20240102', close: 10.8 },
    ]);
  });

  test('returns empty array when items is null', () => {
    const raw = { fields: ['ts_code'], items: null };
    const result = transformTushareResponse(raw);
    expect(result).toEqual([]);
  });

  test('returns empty array when fields is empty', () => {
    const raw = { fields: [], items: [] };
    const result = transformTushareResponse(raw);
    expect(result).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/tools/tushare/api.test.ts`
Expected: FAIL — module `./api.js` not found

**Step 3: Write the implementation**

```typescript
// src/tools/tushare/api.ts
import { readCache, writeCache, describeRequest } from '../../utils/cache.js';
import { logger } from '../../utils/logger.js';

const TUSHARE_API_URL = 'http://api.tushare.pro';

export interface TushareRawResponse {
  fields: string[];
  items: unknown[][] | null;
}

export interface TushareApiResponse {
  data: Record<string, unknown>[];
  url: string;
}

// Convert Tushare tabular { fields, items } to object array
export function transformTushareResponse(raw: TushareRawResponse): Record<string, unknown>[] {
  if (!raw.items || !raw.fields.length) return [];
  return raw.items.map((row) => {
    const obj: Record<string, unknown> = {};
    raw.fields.forEach((field, i) => {
      obj[field] = row[i];
    });
    return obj;
  });
}

export async function callTushare(
  apiName: string,
  params: Record<string, string | number | undefined>,
  fields?: string[],
  options?: { cacheable?: boolean }
): Promise<TushareApiResponse> {
  const label = describeRequest(apiName, params);

  // Check cache first
  if (options?.cacheable) {
    const cached = readCache(apiName, params);
    if (cached) {
      return { data: (cached.data as any).records || [], url: cached.url };
    }
  }

  const token = process.env.TUSHARE_TOKEN;
  if (!token) {
    throw new Error('[Tushare] TUSHARE_TOKEN not set');
  }

  const body: Record<string, unknown> = {
    api_name: apiName,
    token,
    params: Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
    ),
  };
  if (fields?.length) {
    body.fields = fields.join(',');
  }

  let response: Response;
  try {
    response = await fetch(TUSHARE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[Tushare] network error: ${label} — ${message}`);
    throw new Error(`[Tushare] request failed for ${label}: ${message}`);
  }

  const json = await response.json().catch(() => {
    throw new Error(`[Tushare] invalid JSON response for ${label}`);
  });

  if (json.code !== 0) {
    const msg = json.msg || `code ${json.code}`;
    logger.error(`[Tushare] API error: ${label} — ${msg}`);
    throw new Error(`[Tushare] ${msg} (api: ${apiName})`);
  }

  const records = transformTushareResponse(json.data || { fields: [], items: null });
  const url = `tushare://${apiName}?${Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => `${k}=${v}`).join('&')}`;

  // Cache if requested
  if (options?.cacheable) {
    writeCache(apiName, params, { records } as any, url);
  }

  return { data: records, url };
}
```

**Step 4: Run test to verify it passes**

Run: `bun test src/tools/tushare/api.test.ts`
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add src/tools/tushare/api.ts src/tools/tushare/api.test.ts
git commit -m "feat(tushare): add API communication layer"
```

---

### Task 2: Stock Price Tools

**Files:**
- Create: `src/tools/tushare/stock-price.ts`
- Test: `src/tools/tushare/stock-price.test.ts`

**Step 1: Write the failing test**

```typescript
// src/tools/tushare/stock-price.test.ts
import { describe, test, expect } from 'bun:test';
import { getCnStockPrice, getCnStockPrices, getCnStockBasic } from './stock-price.js';

describe('tushare stock price tools', () => {
  test('getCnStockPrice is a DynamicStructuredTool with correct name', () => {
    expect(getCnStockPrice.name).toBe('get_cn_stock_price');
  });

  test('getCnStockPrices is a DynamicStructuredTool with correct name', () => {
    expect(getCnStockPrices.name).toBe('get_cn_stock_prices');
  });

  test('getCnStockBasic is a DynamicStructuredTool with correct name', () => {
    expect(getCnStockBasic.name).toBe('get_cn_stock_basic');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/tools/tushare/stock-price.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

```typescript
// src/tools/tushare/stock-price.ts
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { callTushare } from './api.js';
import { formatToolResult } from '../types.js';

const TS_CODE_DESC = "Stock code in Tushare format: 000001.SZ (Shenzhen), 600519.SH (Shanghai), 830799.BJ (BSE). Use get_cn_stock_list to look up codes.";

const CnStockPriceSchema = z.object({
  ts_code: z.string().describe(TS_CODE_DESC),
  trade_date: z.string().optional().describe("Trade date in YYYYMMDD format. If omitted, returns most recent trading day."),
});

export const getCnStockPrice = new DynamicStructuredTool({
  name: 'get_cn_stock_price',
  description: 'Fetches the latest daily OHLCV data for a Chinese A-share stock, including open, high, low, close, pre_close, change percent, volume, and amount.',
  schema: CnStockPriceSchema,
  func: async (input) => {
    const params: Record<string, string | number | undefined> = {
      ts_code: input.ts_code.trim().toUpperCase(),
      trade_date: input.trade_date,
    };
    const fields = ['ts_code', 'trade_date', 'open', 'high', 'low', 'close', 'pre_close', 'change', 'pct_chg', 'vol', 'amount'];
    const { data, url } = await callTushare('daily', params, fields);
    return formatToolResult(data[0] || {}, [url]);
  },
});

const CnStockPricesSchema = z.object({
  ts_code: z.string().describe(TS_CODE_DESC),
  start_date: z.string().describe("Start date in YYYYMMDD format, e.g. '20240101'."),
  end_date: z.string().describe("End date in YYYYMMDD format, e.g. '20241231'."),
});

export const getCnStockPrices = new DynamicStructuredTool({
  name: 'get_cn_stock_prices',
  description: 'Retrieves historical daily price data for a Chinese A-share stock over a date range. Returns OHLCV with change percent.',
  schema: CnStockPricesSchema,
  func: async (input) => {
    const params: Record<string, string | number | undefined> = {
      ts_code: input.ts_code.trim().toUpperCase(),
      start_date: input.start_date,
      end_date: input.end_date,
    };
    const fields = ['ts_code', 'trade_date', 'open', 'high', 'low', 'close', 'pre_close', 'pct_chg', 'vol', 'amount'];
    // Cache when end_date is in the past
    const endDate = new Date(input.end_date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data, url } = await callTushare('daily', params, fields, { cacheable: endDate < today });
    return formatToolResult(data, [url]);
  },
});

const CnStockBasicSchema = z.object({
  ts_code: z.string().optional().describe(TS_CODE_DESC + " If omitted, returns all stocks for the given trade_date."),
  trade_date: z.string().optional().describe("Trade date in YYYYMMDD format. If omitted, returns latest available."),
});

export const getCnStockBasic = new DynamicStructuredTool({
  name: 'get_cn_stock_basic',
  description: 'Fetches daily valuation metrics for Chinese A-share stocks: PE, PE(TTM), PB, PS, PS(TTM), dividend yield, turnover rate, volume ratio, total/circulating market cap.',
  schema: CnStockBasicSchema,
  func: async (input) => {
    const params: Record<string, string | number | undefined> = {
      ts_code: input.ts_code?.trim().toUpperCase(),
      trade_date: input.trade_date,
    };
    const fields = ['ts_code', 'trade_date', 'close', 'turnover_rate', 'turnover_rate_f', 'volume_ratio', 'pe', 'pe_ttm', 'pb', 'ps', 'ps_ttm', 'dv_ratio', 'dv_ttm', 'total_share', 'float_share', 'total_mv', 'circ_mv'];
    const { data, url } = await callTushare('daily_basic', params, fields);
    return formatToolResult(input.ts_code ? (data[0] || {}) : data, [url]);
  },
});
```

**Step 4: Run test to verify it passes**

Run: `bun test src/tools/tushare/stock-price.test.ts`
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add src/tools/tushare/stock-price.ts src/tools/tushare/stock-price.test.ts
git commit -m "feat(tushare): add stock price and valuation tools"
```

---

### Task 3: Fundamentals Tools

**Files:**
- Create: `src/tools/tushare/fundamentals.ts`
- Test: `src/tools/tushare/fundamentals.test.ts`

**Step 1: Write the failing test**

```typescript
// src/tools/tushare/fundamentals.test.ts
import { describe, test, expect } from 'bun:test';
import { getCnIncome, getCnBalanceSheet, getCnCashflow, getCnFinaIndicator } from './fundamentals.js';

describe('tushare fundamentals tools', () => {
  test('getCnIncome has correct name', () => {
    expect(getCnIncome.name).toBe('get_cn_income');
  });
  test('getCnBalanceSheet has correct name', () => {
    expect(getCnBalanceSheet.name).toBe('get_cn_balance_sheet');
  });
  test('getCnCashflow has correct name', () => {
    expect(getCnCashflow.name).toBe('get_cn_cashflow');
  });
  test('getCnFinaIndicator has correct name', () => {
    expect(getCnFinaIndicator.name).toBe('get_cn_fina_indicator');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/tools/tushare/fundamentals.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

```typescript
// src/tools/tushare/fundamentals.ts
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { callTushare } from './api.js';
import { formatToolResult } from '../types.js';

const TS_CODE_DESC = "Stock code in Tushare format, e.g. '000001.SZ', '600519.SH'.";

const FinancialStatementSchema = z.object({
  ts_code: z.string().describe(TS_CODE_DESC),
  period: z.string().optional().describe("Report period in YYYYMMDD, e.g. '20231231' for annual, '20230630' for H1. If omitted, returns latest available."),
  start_date: z.string().optional().describe("Start announcement date YYYYMMDD to filter reports."),
  end_date: z.string().optional().describe("End announcement date YYYYMMDD to filter reports."),
  report_type: z.enum(['1', '2', '3', '4', '5', '11', '12']).default('1').describe("Report type: 1=consolidated (default), 2=consolidated adjusted, 4=parent company, 5=parent adjusted."),
});

function buildFinaParams(input: z.infer<typeof FinancialStatementSchema>) {
  return {
    ts_code: input.ts_code.trim().toUpperCase(),
    period: input.period,
    start_date: input.start_date,
    end_date: input.end_date,
    report_type: input.report_type,
  };
}

export const getCnIncome = new DynamicStructuredTool({
  name: 'get_cn_income',
  description: "Fetches income statement for a Chinese A-share company. Includes revenue, operating profit, net profit, EPS, and other P&L items. Use period='20231231' for FY2023.",
  schema: FinancialStatementSchema,
  func: async (input) => {
    const params = buildFinaParams(input);
    const fields = ['ts_code', 'ann_date', 'f_ann_date', 'end_date', 'report_type', 'total_revenue', 'revenue', 'total_cogs', 'oper_cost', 'sell_exp', 'admin_exp', 'rd_exp', 'fin_exp', 'operate_profit', 'total_profit', 'income_tax', 'n_income', 'n_income_attr_p', 'basic_eps', 'diluted_eps'];
    const { data, url } = await callTushare('income', params, fields, { cacheable: true });
    return formatToolResult(data, [url]);
  },
});

export const getCnBalanceSheet = new DynamicStructuredTool({
  name: 'get_cn_balance_sheet',
  description: "Retrieves balance sheet for a Chinese A-share company. Shows assets, liabilities, and shareholders' equity at a point in time.",
  schema: FinancialStatementSchema,
  func: async (input) => {
    const params = buildFinaParams(input);
    const fields = ['ts_code', 'ann_date', 'end_date', 'report_type', 'total_assets', 'total_liab', 'total_hldr_eqy_exc_min_int', 'total_cur_assets', 'total_nca', 'total_cur_liab', 'total_ncl', 'money_cap', 'notes_receiv', 'accounts_receiv', 'inventories', 'fix_assets', 'intan_assets', 'goodwill', 'lt_borr', 'st_borr', 'cap_rese', 'surplus_rese', 'undistr_porfit'];
    const { data, url } = await callTushare('balancesheet', params, fields, { cacheable: true });
    return formatToolResult(data, [url]);
  },
});

export const getCnCashflow = new DynamicStructuredTool({
  name: 'get_cn_cashflow',
  description: "Retrieves cash flow statement for a Chinese A-share company. Shows operating, investing, and financing cash flows.",
  schema: FinancialStatementSchema,
  func: async (input) => {
    const params = buildFinaParams(input);
    const fields = ['ts_code', 'ann_date', 'end_date', 'report_type', 'n_cashflow_act', 'n_cashflow_inv_act', 'n_cash_flows_fnc_act', 'c_pay_acq_const_fiolta', 'free_cashflow', 'c_fr_sale_sg', 'c_paid_goods_s', 'c_inf_fr_finan_a', 'c_paid_dist_dp_int_exp'];
    const { data, url } = await callTushare('cashflow', params, fields, { cacheable: true });
    return formatToolResult(data, [url]);
  },
});

const FinaIndicatorSchema = z.object({
  ts_code: z.string().describe(TS_CODE_DESC),
  period: z.string().optional().describe("Report period in YYYYMMDD, e.g. '20231231'."),
  start_date: z.string().optional().describe("Start announcement date YYYYMMDD."),
  end_date: z.string().optional().describe("End announcement date YYYYMMDD."),
});

export const getCnFinaIndicator = new DynamicStructuredTool({
  name: 'get_cn_fina_indicator',
  description: "Fetches key financial indicators for a Chinese A-share company: ROE, ROA, gross margin, net margin, current ratio, debt-to-asset ratio, revenue/profit growth, and more.",
  schema: FinaIndicatorSchema,
  func: async (input) => {
    const params = {
      ts_code: input.ts_code.trim().toUpperCase(),
      period: input.period,
      start_date: input.start_date,
      end_date: input.end_date,
    };
    const fields = ['ts_code', 'ann_date', 'end_date', 'eps', 'bps', 'roe', 'roe_dt', 'roa', 'grossprofit_margin', 'netprofit_margin', 'debt_to_assets', 'current_ratio', 'quick_ratio', 'or_yoy', 'op_yoy', 'profit_yoy', 'equity_yoy', 'assets_yoy', 'ebt_yoy', 'tr_yoy', 'cfps', 'ocfps', 'fcff', 'fcfe'];
    const { data, url } = await callTushare('fina_indicator', params, fields, { cacheable: true });
    return formatToolResult(data, [url]);
  },
});
```

**Step 4: Run test to verify it passes**

Run: `bun test src/tools/tushare/fundamentals.test.ts`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add src/tools/tushare/fundamentals.ts src/tools/tushare/fundamentals.test.ts
git commit -m "feat(tushare): add financial statement and indicator tools"
```

---

### Task 4: Market Reference Tools

**Files:**
- Create: `src/tools/tushare/market-ref.ts`
- Test: `src/tools/tushare/market-ref.test.ts`

**Step 1: Write the failing test**

```typescript
// src/tools/tushare/market-ref.test.ts
import { describe, test, expect } from 'bun:test';
import { getNorthboundFlow, getMarginData, getBlockTrade, getLimitList } from './market-ref.js';

describe('tushare market reference tools', () => {
  test('getNorthboundFlow has correct name', () => {
    expect(getNorthboundFlow.name).toBe('get_northbound_flow');
  });
  test('getMarginData has correct name', () => {
    expect(getMarginData.name).toBe('get_margin_data');
  });
  test('getBlockTrade has correct name', () => {
    expect(getBlockTrade.name).toBe('get_block_trade');
  });
  test('getLimitList has correct name', () => {
    expect(getLimitList.name).toBe('get_limit_list');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/tools/tushare/market-ref.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

```typescript
// src/tools/tushare/market-ref.ts
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { callTushare } from './api.js';
import { formatToolResult } from '../types.js';

const DateRangeSchema = z.object({
  start_date: z.string().optional().describe("Start date in YYYYMMDD format."),
  end_date: z.string().optional().describe("End date in YYYYMMDD format."),
  trade_date: z.string().optional().describe("Specific trade date in YYYYMMDD format."),
});

export const getNorthboundFlow = new DynamicStructuredTool({
  name: 'get_northbound_flow',
  description: 'Fetches daily northbound/southbound capital flow data (Stock Connect). Shows Shanghai Connect (hgt), Shenzhen Connect (sgt), total northbound (north_money), and total southbound (south_money) in millions CNY.',
  schema: DateRangeSchema,
  func: async (input) => {
    const params = {
      start_date: input.start_date,
      end_date: input.end_date,
      trade_date: input.trade_date,
    };
    const fields = ['trade_date', 'ggt_ss', 'ggt_sz', 'hgt', 'sgt', 'north_money', 'south_money'];
    const { data, url } = await callTushare('moneyflow_hsgt', params, fields);
    return formatToolResult(data, [url]);
  },
});

const MarginSchema = z.object({
  trade_date: z.string().optional().describe("Trade date in YYYYMMDD format."),
  exchange_id: z.enum(['SSE', 'SZSE']).optional().describe("Exchange: SSE (Shanghai) or SZSE (Shenzhen)."),
  start_date: z.string().optional().describe("Start date YYYYMMDD."),
  end_date: z.string().optional().describe("End date YYYYMMDD."),
});

export const getMarginData = new DynamicStructuredTool({
  name: 'get_margin_data',
  description: 'Retrieves daily margin trading summary data (融资融券). Shows margin buying balance, margin selling balance, and total margin balance by exchange.',
  schema: MarginSchema,
  func: async (input) => {
    const params = {
      trade_date: input.trade_date,
      exchange_id: input.exchange_id,
      start_date: input.start_date,
      end_date: input.end_date,
    };
    const { data, url } = await callTushare('margin', params);
    return formatToolResult(data, [url]);
  },
});

const BlockTradeSchema = z.object({
  ts_code: z.string().optional().describe("Stock code, e.g. '000001.SZ'. If omitted, returns all block trades for the date."),
  trade_date: z.string().optional().describe("Trade date in YYYYMMDD format."),
  start_date: z.string().optional().describe("Start date YYYYMMDD."),
  end_date: z.string().optional().describe("End date YYYYMMDD."),
});

export const getBlockTrade = new DynamicStructuredTool({
  name: 'get_block_trade',
  description: 'Retrieves block trade (大宗交易) records. Shows buyer, seller, price, volume, and amount for large off-exchange trades.',
  schema: BlockTradeSchema,
  func: async (input) => {
    const params = {
      ts_code: input.ts_code?.trim().toUpperCase(),
      trade_date: input.trade_date,
      start_date: input.start_date,
      end_date: input.end_date,
    };
    const { data, url } = await callTushare('block_trade', params);
    return formatToolResult(data, [url]);
  },
});

const LimitListSchema = z.object({
  trade_date: z.string().describe("Trade date in YYYYMMDD format. Required."),
  limit_type: z.enum(['U', 'D']).optional().describe("Limit type: U=limit up (涨停), D=limit down (跌停). If omitted, returns both."),
});

export const getLimitList = new DynamicStructuredTool({
  name: 'get_limit_list',
  description: 'Retrieves the list of stocks that hit limit up (涨停) or limit down (跌停) on a given trading day. A-share specific feature: 10% for main board, 20% for ChiNext/STAR, 30% for BSE.',
  schema: LimitListSchema,
  func: async (input) => {
    const params: Record<string, string | number | undefined> = {
      trade_date: input.trade_date,
      limit_type: input.limit_type,
    };
    const fields = ['ts_code', 'trade_date', 'name', 'close', 'pct_chg', 'amp', 'fc_ratio', 'fl_ratio', 'fd_amount', 'first_time', 'last_time', 'open_times', 'strth', 'limit'];
    const { data, url } = await callTushare('stk_limit', params, fields);
    return formatToolResult(data, [url]);
  },
});
```

**Step 4: Run test to verify it passes**

Run: `bun test src/tools/tushare/market-ref.test.ts`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add src/tools/tushare/market-ref.ts src/tools/tushare/market-ref.test.ts
git commit -m "feat(tushare): add northbound flow, margin, block trade, limit list tools"
```

---

### Task 5: Concept/Sector Tools

**Files:**
- Create: `src/tools/tushare/concept.ts`
- Test: `src/tools/tushare/concept.test.ts`

**Step 1: Write the failing test**

```typescript
// src/tools/tushare/concept.test.ts
import { describe, test, expect } from 'bun:test';
import { getConceptList, getConceptStocks } from './concept.js';

describe('tushare concept tools', () => {
  test('getConceptList has correct name', () => {
    expect(getConceptList.name).toBe('get_concept_list');
  });
  test('getConceptStocks has correct name', () => {
    expect(getConceptStocks.name).toBe('get_concept_stocks');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/tools/tushare/concept.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

```typescript
// src/tools/tushare/concept.ts
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { callTushare } from './api.js';
import { formatToolResult } from '../types.js';

export const getConceptList = new DynamicStructuredTool({
  name: 'get_concept_list',
  description: 'Retrieves the list of all concept/theme sectors (概念板块) from Tonghuashun. Each concept has an ID, name, and stock count. Use concept IDs with get_concept_stocks to find constituent stocks.',
  schema: z.object({
    src: z.enum(['ts']).default('ts').describe("Data source. Default 'ts' (Tonghuashun)."),
  }),
  func: async (input) => {
    const { data, url } = await callTushare('concept', { src: input.src });
    return formatToolResult(data, [url]);
  },
});

const ConceptStocksSchema = z.object({
  id: z.string().describe("Concept ID from get_concept_list, e.g. 'TS2' for a specific concept."),
  ts_code: z.string().optional().describe("Filter by specific stock code."),
});

export const getConceptStocks = new DynamicStructuredTool({
  name: 'get_concept_stocks',
  description: 'Retrieves the list of stocks belonging to a specific concept/theme sector. Use get_concept_list first to find concept IDs.',
  schema: ConceptStocksSchema,
  func: async (input) => {
    const params = {
      id: input.id,
      ts_code: input.ts_code?.trim().toUpperCase(),
    };
    const { data, url } = await callTushare('concept_detail', params);
    return formatToolResult(data, [url]);
  },
});
```

**Step 4: Run test to verify it passes**

Run: `bun test src/tools/tushare/concept.test.ts`
Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add src/tools/tushare/concept.ts src/tools/tushare/concept.test.ts
git commit -m "feat(tushare): add concept/sector tools"
```

---

### Task 6: News and Stock Info Tools

**Files:**
- Create: `src/tools/tushare/news.ts`
- Create: `src/tools/tushare/stock-info.ts`
- Test: `src/tools/tushare/news.test.ts`
- Test: `src/tools/tushare/stock-info.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/tools/tushare/news.test.ts
import { describe, test, expect } from 'bun:test';
import { getCnNews } from './news.js';

describe('tushare news tools', () => {
  test('getCnNews has correct name', () => {
    expect(getCnNews.name).toBe('get_cn_news');
  });
});
```

```typescript
// src/tools/tushare/stock-info.test.ts
import { describe, test, expect } from 'bun:test';
import { getCnStockList, getTradeCalendar } from './stock-info.js';

describe('tushare stock info tools', () => {
  test('getCnStockList has correct name', () => {
    expect(getCnStockList.name).toBe('get_cn_stock_list');
  });
  test('getTradeCalendar has correct name', () => {
    expect(getTradeCalendar.name).toBe('get_trade_calendar');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test src/tools/tushare/news.test.ts src/tools/tushare/stock-info.test.ts`
Expected: FAIL

**Step 3: Write the implementations**

```typescript
// src/tools/tushare/news.ts
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { callTushare } from './api.js';
import { formatToolResult } from '../types.js';

const CnNewsSchema = z.object({
  src: z.string().optional().describe("News source filter, e.g. '新浪财经', '华尔街见闻', '同花顺', '第一财经'. If omitted, returns from all sources."),
  start_date: z.string().describe("Start datetime, format: 'YYYY-MM-DD HH:MM:SS', e.g. '2024-01-01 00:00:00'."),
  end_date: z.string().describe("End datetime, format: 'YYYY-MM-DD HH:MM:SS', e.g. '2024-01-02 00:00:00'."),
});

export const getCnNews = new DynamicStructuredTool({
  name: 'get_cn_news',
  description: 'Retrieves Chinese financial news from major sources (新浪财经, 华尔街见闻, 同花顺, 第一财经, 财新, etc.). Returns title, content, publication time, and source.',
  schema: CnNewsSchema,
  func: async (input) => {
    const params = {
      src: input.src,
      start_date: input.start_date,
      end_date: input.end_date,
    };
    const fields = ['datetime', 'title', 'content', 'src'];
    const { data, url } = await callTushare('major_news', params, fields);
    return formatToolResult(data, [url]);
  },
});
```

```typescript
// src/tools/tushare/stock-info.ts
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { callTushare } from './api.js';
import { formatToolResult } from '../types.js';

const StockListSchema = z.object({
  exchange: z.enum(['SSE', 'SZSE', 'BSE']).optional().describe("Exchange: SSE (Shanghai), SZSE (Shenzhen), BSE (Beijing). If omitted, returns all."),
  list_status: z.enum(['L', 'D', 'P']).default('L').describe("Listing status: L=listed (default), D=delisted, P=suspended."),
});

export const getCnStockList = new DynamicStructuredTool({
  name: 'get_cn_stock_list',
  description: 'Retrieves the directory of Chinese A-share stocks with basic info: stock code, name, area, industry, listing date, and market. Use this to look up stock codes (ts_code) by company name.',
  schema: StockListSchema,
  func: async (input) => {
    const params = {
      exchange: input.exchange,
      list_status: input.list_status,
    };
    const fields = ['ts_code', 'symbol', 'name', 'area', 'industry', 'market', 'list_date'];
    const { data, url } = await callTushare('stock_basic', params, fields, { cacheable: true });
    return formatToolResult(data, [url]);
  },
});

const TradeCalendarSchema = z.object({
  exchange: z.enum(['SSE', 'SZSE']).default('SSE').describe("Exchange: SSE (Shanghai, default) or SZSE (Shenzhen)."),
  start_date: z.string().optional().describe("Start date YYYYMMDD."),
  end_date: z.string().optional().describe("End date YYYYMMDD."),
  is_open: z.enum(['0', '1']).optional().describe("Filter: '1' = open days only, '0' = closed days only."),
});

export const getTradeCalendar = new DynamicStructuredTool({
  name: 'get_trade_calendar',
  description: 'Retrieves the trading calendar for Chinese stock exchanges. Shows which dates are trading days vs holidays.',
  schema: TradeCalendarSchema,
  func: async (input) => {
    const params = {
      exchange: input.exchange,
      start_date: input.start_date,
      end_date: input.end_date,
      is_open: input.is_open,
    };
    const fields = ['exchange', 'cal_date', 'is_open', 'pretrade_date'];
    const { data, url } = await callTushare('trade_cal', params, fields, { cacheable: true });
    return formatToolResult(data, [url]);
  },
});
```

**Step 4: Run tests to verify they pass**

Run: `bun test src/tools/tushare/news.test.ts src/tools/tushare/stock-info.test.ts`
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add src/tools/tushare/news.ts src/tools/tushare/news.test.ts src/tools/tushare/stock-info.ts src/tools/tushare/stock-info.test.ts
git commit -m "feat(tushare): add news and stock info tools"
```

---

### Task 7: Index and Export Module

**Files:**
- Create: `src/tools/tushare/index.ts`

**Step 1: Write the export module**

```typescript
// src/tools/tushare/index.ts
export { getCnStockPrice, getCnStockPrices, getCnStockBasic } from './stock-price.js';
export { getCnIncome, getCnBalanceSheet, getCnCashflow, getCnFinaIndicator } from './fundamentals.js';
export { getNorthboundFlow, getMarginData, getBlockTrade, getLimitList } from './market-ref.js';
export { getConceptList, getConceptStocks } from './concept.js';
export { getCnNews } from './news.js';
export { getCnStockList, getTradeCalendar } from './stock-info.js';
export { createCnMarketSearch, CN_MARKET_SEARCH_DESCRIPTION } from './cn-market-search.js';
```

**Step 2: Commit (no test needed — pure re-exports)**

```bash
git add src/tools/tushare/index.ts
git commit -m "feat(tushare): add index module"
```

---

### Task 8: Meta-Tool — CN Market Search

**Files:**
- Create: `src/tools/tushare/cn-market-search.ts`
- Test: `src/tools/tushare/cn-market-search.test.ts`

**Step 1: Write the failing test**

```typescript
// src/tools/tushare/cn-market-search.test.ts
import { describe, test, expect } from 'bun:test';
import { createCnMarketSearch, CN_MARKET_SEARCH_DESCRIPTION } from './cn-market-search.js';

describe('cn_market_search meta-tool', () => {
  test('creates a tool with correct name', () => {
    const tool = createCnMarketSearch('gpt-5.4');
    expect(tool.name).toBe('cn_market_search');
  });

  test('description is non-empty', () => {
    expect(CN_MARKET_SEARCH_DESCRIPTION.length).toBeGreaterThan(100);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/tools/tushare/cn-market-search.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

```typescript
// src/tools/tushare/cn-market-search.ts
import { DynamicStructuredTool, StructuredToolInterface } from '@langchain/core/tools';
import type { RunnableConfig } from '@langchain/core/runnables';
import { AIMessage, ToolCall } from '@langchain/core/messages';
import { z } from 'zod';
import { callLlm } from '../../model/llm.js';
import { formatToolResult } from '../types.js';
import { getCurrentDate } from '../../agent/prompts.js';

// Import all tushare atomic tools
import { getCnStockPrice, getCnStockPrices, getCnStockBasic } from './stock-price.js';
import { getCnIncome, getCnBalanceSheet, getCnCashflow, getCnFinaIndicator } from './fundamentals.js';
import { getNorthboundFlow, getMarginData, getBlockTrade, getLimitList } from './market-ref.js';
import { getConceptList, getConceptStocks } from './concept.js';
import { getCnNews } from './news.js';
import { getCnStockList, getTradeCalendar } from './stock-info.js';

export const CN_MARKET_SEARCH_DESCRIPTION = `
Intelligent meta-tool for Chinese A-share market data research. Takes a natural language query (Chinese or English) and automatically routes to appropriate Tushare data tools.

## When to Use

- Chinese A-share stock prices and historical data
- A-share valuation metrics (PE, PB, PS, market cap, turnover)
- Chinese company financial statements (income, balance sheet, cash flow)
- Key financial indicators (ROE, ROA, margins, growth rates)
- Northbound/southbound capital flows (Stock Connect / 北向资金)
- Margin trading data (融资融券)
- Block trades (大宗交易)
- Limit up/down lists (涨跌停)
- Concept/theme sectors (概念板块)
- Chinese financial news
- Stock code lookup by company name

## When NOT to Use

- US stocks or international markets (use financial_search instead)
- Hong Kong stocks (not yet supported)
- General web searches (use web_search)
- Questions that don't require Chinese market data

## Usage Notes

- Accepts both Chinese and English queries
- Handles company name → ts_code resolution (茅台 → 600519.SH, 宁德时代 → 300750.SZ)
- Date format: YYYYMMDD (no hyphens)
- Stock code format: 000001.SZ (Shenzhen), 600519.SH (Shanghai), 830799.BJ (BSE)
- Returns structured JSON data with source references
`.trim();

const CN_TOOLS: StructuredToolInterface[] = [
  getCnStockPrice, getCnStockPrices, getCnStockBasic,
  getCnIncome, getCnBalanceSheet, getCnCashflow, getCnFinaIndicator,
  getNorthboundFlow, getMarginData, getBlockTrade, getLimitList,
  getConceptList, getConceptStocks,
  getCnNews,
  getCnStockList, getTradeCalendar,
];

const CN_TOOL_MAP = new Map(CN_TOOLS.map(t => [t.name, t]));

function formatSubToolName(name: string): string {
  return name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function buildRouterPrompt(): string {
  return `You are a Chinese A-share market data routing assistant.
Current date: ${getCurrentDate()}

Given a user's query about Chinese stock market data, call the appropriate tool(s).

## Guidelines

1. **Stock Code Resolution** (ts_code format):
   - 贵州茅台/茅台 → 600519.SH
   - 宁德时代 → 300750.SZ
   - 平安银行 → 000001.SZ
   - 比亚迪 → 002594.SZ
   - 中芯国际 → 688981.SH (STAR Market)
   - If unsure, use get_cn_stock_list to look up by name
   - Shanghai codes: 6xxxxx.SH, 688xxx.SH (STAR)
   - Shenzhen codes: 0xxxxx.SZ, 3xxxxx.SZ (ChiNext)
   - Beijing codes: 8xxxxx.BJ

2. **Date Format**: Always YYYYMMDD (no hyphens)
   - "去年" → 20250101 to 20251231 (last year)
   - "最近一周" → 7 days ago to today
   - "2024年报" → period=20241231

3. **Tool Selection**:
   - Current/recent price → get_cn_stock_price
   - Historical prices → get_cn_stock_prices
   - PE/PB/市值/换手率 → get_cn_stock_basic
   - 营收/净利润/利润表 → get_cn_income
   - 资产/负债/资产负债表 → get_cn_balance_sheet
   - 现金流 → get_cn_cashflow
   - ROE/ROA/毛利率/增长率 → get_cn_fina_indicator
   - 北向资金/南向资金/外资 → get_northbound_flow
   - 融资融券 → get_margin_data
   - 大宗交易 → get_block_trade
   - 涨停/跌停 → get_limit_list
   - 概念/题材/板块 → get_concept_list + get_concept_stocks
   - 新闻/资讯 → get_cn_news
   - 股票代码查询 → get_cn_stock_list
   - 交易日历 → get_trade_calendar

4. **Efficiency**:
   - Use specific fields when possible
   - For comparisons, call the same tool for each stock

Call the appropriate tool(s) now.`;
}

const CnMarketSearchSchema = z.object({
  query: z.string().describe('Natural language query about Chinese A-share market data (Chinese or English)'),
});

export function createCnMarketSearch(model: string): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'cn_market_search',
    description: `Intelligent agentic search for Chinese A-share market data. Takes a natural language query (Chinese or English) and routes to appropriate data tools. Use for:
- A-share stock prices and valuations (PE, PB, market cap)
- Chinese company financials (income, balance sheet, cash flow)
- Northbound/southbound capital flows (北向资金)
- Margin trading, block trades, limit up/down lists
- Concept/theme sectors (概念板块)
- Chinese financial news`,
    schema: CnMarketSearchSchema,
    func: async (input, _runManager, config?: RunnableConfig) => {
      const onProgress = config?.metadata?.onProgress as ((msg: string) => void) | undefined;

      onProgress?.('Searching Chinese market data...');
      const { response } = await callLlm(input.query, {
        model,
        systemPrompt: buildRouterPrompt(),
        tools: CN_TOOLS,
      });
      const aiMessage = response as AIMessage;

      const toolCalls = aiMessage.tool_calls as ToolCall[];
      if (!toolCalls || toolCalls.length === 0) {
        return formatToolResult({ error: 'No tools selected for query' }, []);
      }

      const toolNames = [...new Set(toolCalls.map(tc => formatSubToolName(tc.name)))];
      onProgress?.(`Fetching from ${toolNames.join(', ')}...`);

      const results = await Promise.all(
        toolCalls.map(async (tc) => {
          try {
            const tool = CN_TOOL_MAP.get(tc.name);
            if (!tool) throw new Error(`Tool '${tc.name}' not found`);
            const rawResult = await tool.invoke(tc.args);
            const result = typeof rawResult === 'string' ? rawResult : JSON.stringify(rawResult);
            const parsed = JSON.parse(result);
            return { tool: tc.name, args: tc.args, data: parsed.data, sourceUrls: parsed.sourceUrls || [], error: null };
          } catch (error) {
            return { tool: tc.name, args: tc.args, data: null, sourceUrls: [], error: error instanceof Error ? error.message : String(error) };
          }
        })
      );

      const successfulResults = results.filter(r => r.error === null);
      const failedResults = results.filter(r => r.error !== null);
      const allUrls = results.flatMap(r => r.sourceUrls);

      const combinedData: Record<string, unknown> = {};
      for (const result of successfulResults) {
        const tsCode = (result.args as Record<string, unknown>).ts_code as string | undefined;
        const key = tsCode ? `${result.tool}_${tsCode}` : result.tool;
        combinedData[key] = result.data;
      }

      if (failedResults.length > 0) {
        combinedData._errors = failedResults.map(r => ({ tool: r.tool, args: r.args, error: r.error }));
      }

      return formatToolResult(combinedData, allUrls);
    },
  });
}
```

**Step 4: Run test to verify it passes**

Run: `bun test src/tools/tushare/cn-market-search.test.ts`
Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add src/tools/tushare/cn-market-search.ts src/tools/tushare/cn-market-search.test.ts
git commit -m "feat(tushare): add cn_market_search meta-tool with LLM routing"
```

---

### Task 9: Register in Tool Registry

**Files:**
- Modify: `src/tools/registry.ts:1-4` (imports)
- Modify: `src/tools/registry.ts:82-83` (add conditional registration after existing tools)

**Step 1: No test needed — integration test**

**Step 2: Add import and registration**

Add to the imports at the top of `src/tools/registry.ts`:

```typescript
import { createCnMarketSearch, CN_MARKET_SEARCH_DESCRIPTION } from './tushare/index.js';
```

Add after the `heartbeat` tool registration (line ~82), before the web_search conditional block:

```typescript
  // Include cn_market_search if Tushare token is configured
  if (process.env.TUSHARE_TOKEN) {
    tools.push({
      name: 'cn_market_search',
      tool: createCnMarketSearch(model),
      description: CN_MARKET_SEARCH_DESCRIPTION,
    });
  }
```

**Step 3: Commit**

```bash
git add src/tools/registry.ts
git commit -m "feat(tushare): register cn_market_search in tool registry"
```

---

### Task 10: Update Environment Configuration

**Files:**
- Modify: `env.example` (add TUSHARE_TOKEN)

**Step 1: Add to env.example**

After the `FINANCIAL_DATASETS_API_KEY` line, add:

```
# Chinese A-Share Market API (Tushare Pro)
TUSHARE_TOKEN=your-tushare-token
```

**Step 2: Commit**

```bash
git add env.example
git commit -m "feat(tushare): add TUSHARE_TOKEN to env.example"
```

---

### Task 11: Run All Tests

**Step 1: Run the full Tushare test suite**

Run: `bun test src/tools/tushare/`
Expected: All tests PASS

**Step 2: Run the existing test suite to verify no regressions**

Run: `bun test`
Expected: All existing tests still PASS

**Step 3: Final commit if any adjustments needed**

---

## File Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/tools/tushare/api.ts` | Create | Tushare REST API communication layer |
| `src/tools/tushare/api.test.ts` | Create | Unit tests for API layer |
| `src/tools/tushare/stock-price.ts` | Create | Daily quotes + valuation metrics |
| `src/tools/tushare/stock-price.test.ts` | Create | Unit tests |
| `src/tools/tushare/fundamentals.ts` | Create | Income, balance sheet, cashflow, indicators |
| `src/tools/tushare/fundamentals.test.ts` | Create | Unit tests |
| `src/tools/tushare/market-ref.ts` | Create | Northbound, margin, block trade, limits |
| `src/tools/tushare/market-ref.test.ts` | Create | Unit tests |
| `src/tools/tushare/concept.ts` | Create | Concept sectors and constituents |
| `src/tools/tushare/concept.test.ts` | Create | Unit tests |
| `src/tools/tushare/news.ts` | Create | Chinese financial news |
| `src/tools/tushare/news.test.ts` | Create | Unit tests |
| `src/tools/tushare/stock-info.ts` | Create | Stock directory and trade calendar |
| `src/tools/tushare/stock-info.test.ts` | Create | Unit tests |
| `src/tools/tushare/cn-market-search.ts` | Create | LLM-routed meta-tool |
| `src/tools/tushare/cn-market-search.test.ts` | Create | Unit tests |
| `src/tools/tushare/index.ts` | Create | Module re-exports |
| `src/tools/registry.ts` | Modify | Register cn_market_search |
| `env.example` | Modify | Add TUSHARE_TOKEN |
