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
