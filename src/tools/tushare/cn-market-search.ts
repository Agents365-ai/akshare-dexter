import { DynamicStructuredTool, StructuredToolInterface } from '@langchain/core/tools';
import type { RunnableConfig } from '@langchain/core/runnables';
import { AIMessage, ToolCall } from '@langchain/core/messages';
import { z } from 'zod';
import { callLlm } from '../../model/llm.js';
import { formatToolResult } from '../types.js';
import { getCurrentDate } from '../../agent/prompts.js';

import { getCnStockPrice, getCnStockPrices, getCnStockBasic } from './stock-price.js';
import { getCnIncome, getCnBalanceSheet, getCnCashflow, getCnFinaIndicator } from './fundamentals.js';
import { getNorthboundFlow, getMarginData, getBlockTrade, getLimitList } from './market-ref.js';
import { getConceptList, getConceptStocks } from './concept.js';
import { getCnNews } from './news.js';
import { getCnStockList, getTradeCalendar } from './stock-info.js';
import { getHkStockList, getHkDaily, getHkDailyHistory, getHkIncome, getHkBalanceSheet, getHkCashflow, getHkFinaIndicator, getHkHold } from './hk-stock.js';

export const CN_MARKET_SEARCH_DESCRIPTION = `
Intelligent meta-tool for Chinese A-share and Hong Kong stock market data research. Takes a natural language query (Chinese or English) and automatically routes to appropriate Tushare data tools.

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
- Hong Kong stock prices and historical data (港股行情)
- Hong Kong stock list and basic info (港股列表)
- Hong Kong company financial statements (港股财报: income, balance sheet, cash flow)
- Hong Kong financial indicators (港股ROE/EPS/margins)
- Stock Connect holdings data (沪深港通持股)

## When NOT to Use

- US stocks or international markets (use financial_search instead)
- General web searches (use web_search)
- Questions that don't require Chinese/HK market data

## Usage Notes

- Accepts both Chinese and English queries
- Handles company name → ts_code resolution (茅台 → 600519.SH, 宁德时代 → 300750.SZ, 腾讯 → 00700.HK)
- Date format: YYYYMMDD (no hyphens)
- A-share code format: 000001.SZ (Shenzhen), 600519.SH (Shanghai), 830799.BJ (BSE)
- HK stock code format: 00700.HK (Tencent), 09988.HK (Alibaba)
- Returns structured JSON data with source references
`.trim();

const CN_TOOLS: StructuredToolInterface[] = [
  getCnStockPrice, getCnStockPrices, getCnStockBasic,
  getCnIncome, getCnBalanceSheet, getCnCashflow, getCnFinaIndicator,
  getNorthboundFlow, getMarginData, getBlockTrade, getLimitList,
  getConceptList, getConceptStocks,
  getCnNews,
  getCnStockList, getTradeCalendar,
  getHkStockList, getHkDaily, getHkDailyHistory,
  getHkIncome, getHkBalanceSheet, getHkCashflow, getHkFinaIndicator,
  getHkHold,
];

const CN_TOOL_MAP = new Map(CN_TOOLS.map(t => [t.name, t]));

function formatSubToolName(name: string): string {
  return name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function buildRouterPrompt(): string {
  return `You are a Chinese A-share and Hong Kong stock market data routing assistant.
Current date: ${getCurrentDate()}

Given a user's query about Chinese or Hong Kong stock market data, call the appropriate tool(s).

## Guidelines

1. **Stock Code Resolution** (ts_code format):
   - 贵州茅台/茅台 → 600519.SH
   - 宁德时代 → 300750.SZ
   - 平安银行 → 000001.SZ
   - 比亚迪 → 002594.SZ
   - 中芯国际 → 688981.SH (STAR Market)
   - 腾讯/腾讯控股 → 00700.HK
   - 阿里巴巴 → 09988.HK
   - 美团 → 03690.HK
   - 小米集团 → 01810.HK
   - If unsure about A-share, use get_cn_stock_list to look up by name
   - If unsure about HK stock, use get_hk_stock_list to look up by name
   - Shanghai codes: 6xxxxx.SH, 688xxx.SH (STAR)
   - Shenzhen codes: 0xxxxx.SZ, 3xxxxx.SZ (ChiNext)
   - Beijing codes: 8xxxxx.BJ
   - Hong Kong codes: xxxxx.HK (5-digit zero-padded)

2. **Date Format**: Always YYYYMMDD (no hyphens)
   - "去年" → 20250101 to 20251231 (last year)
   - "最近一周" → 7 days ago to today
   - "2024年报" → period=20241231

3. **Tool Selection — A-shares**:
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

4. **Tool Selection — Hong Kong Stocks (港股)**:
   - 港股列表/港股代码查询 → get_hk_stock_list
   - 港股当日行情/最新价格 → get_hk_daily
   - 港股历史行情/港股K线 → get_hk_daily_history
   - 港股利润表/港股营收/港股净利润 → get_hk_income
   - 港股资产负债表/港股资产/港股负债 → get_hk_balance_sheet
   - 港股现金流/港股经营现金流 → get_hk_cashflow
   - 港股ROE/港股EPS/港股财务指标 → get_hk_fina_indicator
   - 沪深港通持股/港股通持股/北向持股 → get_hk_hold

5. **Efficiency**:
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
    description: `Intelligent agentic search for Chinese A-share and Hong Kong stock market data. Takes a natural language query (Chinese or English) and routes to appropriate data tools. Use for:
- A-share stock prices and valuations (PE, PB, market cap)
- Chinese company financials (income, balance sheet, cash flow)
- Northbound/southbound capital flows (北向资金)
- Margin trading, block trades, limit up/down lists
- Concept/theme sectors (概念板块)
- Chinese financial news
- Hong Kong stock prices, history, and stock list (港股行情)
- Hong Kong company financials and indicators (港股财报/财务指标)
- Stock Connect holdings (沪深港通持股)`,
    schema: CnMarketSearchSchema,
    func: async (input, _runManager, config?: RunnableConfig) => {
      const onProgress = config?.metadata?.onProgress as ((msg: string) => void) | undefined;

      onProgress?.('Searching Chinese market data...');
      const { response } = await callLlm(input.query, {
        model,
        systemPrompt: buildRouterPrompt(),
        tools: CN_TOOLS,
      });
      if (typeof response === 'string') {
        return formatToolResult({ error: 'Router returned text instead of tool calls', text: response }, []);
      }
      const aiMessage = response as AIMessage;

      const toolCalls = aiMessage.tool_calls as ToolCall[];
      if (!toolCalls || toolCalls.length === 0) {
        return formatToolResult({ error: 'No tools selected for query' }, []);
      }

      const toolNames = [...new Set(toolCalls.map(tc => formatSubToolName(tc.name)))];
      onProgress?.(`Fetching from ${toolNames.join(', ')}...`);

      const MAX_RESULT_CHARS = 20_000;

      const results = await Promise.all(
        toolCalls.map(async (tc) => {
          try {
            const tool = CN_TOOL_MAP.get(tc.name);
            if (!tool) throw new Error(`Tool '${tc.name}' not found`);
            const rawResult = await tool.invoke(tc.args);
            const result = typeof rawResult === 'string' ? rawResult : JSON.stringify(rawResult);
            const parsed = JSON.parse(result);
            let data = parsed.data;
            // Truncate large array results to prevent context overflow
            if (Array.isArray(data) && JSON.stringify(data).length > MAX_RESULT_CHARS) {
              const totalCount = data.length;
              const truncated = data.slice(0, 50);
              data = { items: truncated, total_count: totalCount, truncated: true, note: `Showing 50 of ${totalCount} results` };
            }
            return { tool: tc.name, args: tc.args, data, sourceUrls: parsed.sourceUrls || [], error: null };
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
