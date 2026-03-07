import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { callTushare } from './api.js';
import { formatToolResult } from '../types.js';

const HK_CODE_DESC = "Hong Kong stock code in Tushare format, e.g. '00700.HK' (Tencent), '09988.HK' (Alibaba), '00005.HK' (HSBC). Use get_hk_stock_list to look up codes.";

// HK financial APIs return key-value rows {name, ind_name, ind_value} — pivot to a flat object
function pivotHkFinancialData(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  if (!rows.length) return rows;
  // Group by report period (end_date or ann_date)
  const groups = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    const key = String(row.end_date || row.ann_date || 'latest');
    if (!groups.has(key)) groups.set(key, { end_date: row.end_date, ann_date: row.ann_date });
    const name = String(row.ind_name || row.name || '');
    if (name) groups.get(key)![name] = row.ind_value;
  }
  return [...groups.values()];
}

const HkStockListSchema = z.object({
  list_status: z.enum(['L', 'D', 'P']).default('L').describe("Listing status: L=listed (default), D=delisted, P=suspended."),
});

export const getHkStockList = new DynamicStructuredTool({
  name: 'get_hk_stock_list',
  description: 'Lists Hong Kong stocks with basic info: name, English name, market, listing date, currency, ISIN. Use to look up HK stock codes by name.',
  schema: HkStockListSchema,
  func: async (input) => {
    const fields = ['ts_code', 'name', 'fullname', 'enname', 'market', 'list_status', 'list_date', 'curr_type'];
    const { data, url } = await callTushare('hk_basic', { list_status: input.list_status }, fields, { cacheable: true });
    return formatToolResult(data, [url]);
  },
});

const HkDailySchema = z.object({
  ts_code: z.string().describe(HK_CODE_DESC),
  trade_date: z.string().optional().describe("Trade date in YYYYMMDD format. If omitted, returns most recent trading day."),
});

export const getHkDaily = new DynamicStructuredTool({
  name: 'get_hk_daily',
  description: 'Fetches the latest daily OHLCV data for a Hong Kong stock, including open, high, low, close, pre_close, change percent, volume, and amount.',
  schema: HkDailySchema,
  func: async (input) => {
    const params: Record<string, string | number | undefined> = {
      ts_code: input.ts_code.trim().toUpperCase(),
      trade_date: input.trade_date,
    };
    const fields = ['ts_code', 'trade_date', 'open', 'high', 'low', 'close', 'pre_close', 'change', 'pct_chg', 'vol', 'amount'];
    const { data, url } = await callTushare('hk_daily', params, fields);
    return formatToolResult(data[0] || {}, [url]);
  },
});

const HkDailyHistorySchema = z.object({
  ts_code: z.string().describe(HK_CODE_DESC),
  start_date: z.string().describe("Start date in YYYYMMDD format, e.g. '20240101'."),
  end_date: z.string().describe("End date in YYYYMMDD format, e.g. '20241231'."),
});

export const getHkDailyHistory = new DynamicStructuredTool({
  name: 'get_hk_daily_history',
  description: 'Retrieves historical daily price data for a Hong Kong stock over a date range. Returns OHLCV with change percent.',
  schema: HkDailyHistorySchema,
  func: async (input) => {
    const params: Record<string, string | number | undefined> = {
      ts_code: input.ts_code.trim().toUpperCase(),
      start_date: input.start_date,
      end_date: input.end_date,
    };
    const fields = ['ts_code', 'trade_date', 'open', 'high', 'low', 'close', 'pre_close', 'pct_chg', 'vol', 'amount'];
    const endDate = new Date(input.end_date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data, url } = await callTushare('hk_daily', params, fields, { cacheable: endDate < today });
    return formatToolResult(data, [url]);
  },
});

// --- HK Financial Statement Tools ---

const HkFinancialSchema = z.object({
  ts_code: z.string().describe(HK_CODE_DESC),
  period: z.string().optional().describe("Report period in YYYYMMDD, e.g. '20231231' for annual, '20230630' for H1. If omitted, returns latest available."),
});

export const getHkIncome = new DynamicStructuredTool({
  name: 'get_hk_income',
  description: "Fetches income statement for a Hong Kong listed company. Returns revenue, operating profit, net profit, EPS, and other P&L items. Data is pivoted from Tushare's key-value format.",
  schema: HkFinancialSchema,
  func: async (input) => {
    const params: Record<string, string | undefined> = {
      ts_code: input.ts_code.trim().toUpperCase(),
      period: input.period,
    };
    const { data, url } = await callTushare('hk_income', params, [], { cacheable: true });
    return formatToolResult(pivotHkFinancialData(data), [url]);
  },
});

export const getHkBalanceSheet = new DynamicStructuredTool({
  name: 'get_hk_balance_sheet',
  description: "Retrieves balance sheet for a Hong Kong listed company. Shows assets, liabilities, and equity. Data is pivoted from Tushare's key-value format.",
  schema: HkFinancialSchema,
  func: async (input) => {
    const params: Record<string, string | undefined> = {
      ts_code: input.ts_code.trim().toUpperCase(),
      period: input.period,
    };
    const { data, url } = await callTushare('hk_balancesheet', params, [], { cacheable: true });
    return formatToolResult(pivotHkFinancialData(data), [url]);
  },
});

export const getHkCashflow = new DynamicStructuredTool({
  name: 'get_hk_cashflow',
  description: "Retrieves cash flow statement for a Hong Kong listed company. Shows operating, investing, and financing cash flows. Data is pivoted from Tushare's key-value format.",
  schema: HkFinancialSchema,
  func: async (input) => {
    const params: Record<string, string | undefined> = {
      ts_code: input.ts_code.trim().toUpperCase(),
      period: input.period,
    };
    const { data, url } = await callTushare('hk_cashflow', params, [], { cacheable: true });
    return formatToolResult(pivotHkFinancialData(data), [url]);
  },
});

export const getHkFinaIndicator = new DynamicStructuredTool({
  name: 'get_hk_fina_indicator',
  description: "Fetches key financial indicators for a Hong Kong listed company: EPS, ROE, ROA, margins, debt ratios, growth rates, and 60+ metrics.",
  schema: HkFinancialSchema,
  func: async (input) => {
    const params: Record<string, string | undefined> = {
      ts_code: input.ts_code.trim().toUpperCase(),
      period: input.period,
    };
    const { data, url } = await callTushare('hk_fina_indicator', params, [], { cacheable: true });
    return formatToolResult(pivotHkFinancialData(data), [url]);
  },
});

// --- Stock Connect Holdings ---

const HkHoldSchema = z.object({
  ts_code: z.string().optional().describe("Stock code (A-share or HK). Optional — if omitted, returns all holdings for the trade_date."),
  trade_date: z.string().optional().describe("Trade date in YYYYMMDD format."),
  exchange: z.enum(['SH', 'SZ']).optional().describe("Exchange: SH=Shanghai Connect (沪股通/港股通沪), SZ=Shenzhen Connect (深股通/港股通深)."),
});

export const getHkHold = new DynamicStructuredTool({
  name: 'get_hk_hold',
  description: "Fetches Stock Connect holdings data (沪深港通持股). Shows mainland investor holdings of HK stocks or HK investor holdings of A-shares. Requires at least ts_code or trade_date.",
  schema: HkHoldSchema,
  func: async (input) => {
    const params: Record<string, string | undefined> = {
      ts_code: input.ts_code?.trim().toUpperCase(),
      trade_date: input.trade_date,
      exchange: input.exchange,
    };
    const { data, url } = await callTushare('hk_hold', params, ['trade_date', 'ts_code', 'name', 'vol', 'ratio', 'exchange'], { cacheable: true });
    return formatToolResult(data, [url]);
  },
});
