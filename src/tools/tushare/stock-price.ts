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
