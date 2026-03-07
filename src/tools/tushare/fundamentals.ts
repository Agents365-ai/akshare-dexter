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
