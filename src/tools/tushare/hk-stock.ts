import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { callTushare } from './api.js';
import { formatToolResult } from '../types.js';

const HK_CODE_DESC = "Hong Kong stock code in Tushare format, e.g. '00700.HK' (Tencent), '09988.HK' (Alibaba), '00005.HK' (HSBC). Use get_hk_stock_list to look up codes.";

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
