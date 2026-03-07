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
