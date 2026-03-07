import { describe, test, expect } from 'bun:test';
import { getHkStockList, getHkDaily, getHkDailyHistory, getHkIncome, getHkBalanceSheet, getHkCashflow, getHkFinaIndicator, getHkHold } from './hk-stock.js';

describe('tushare hk stock tools', () => {
  test('getHkStockList is a DynamicStructuredTool with correct name', () => {
    expect(getHkStockList.name).toBe('get_hk_stock_list');
  });
  test('getHkDaily is a DynamicStructuredTool with correct name', () => {
    expect(getHkDaily.name).toBe('get_hk_daily');
  });
  test('getHkDailyHistory is a DynamicStructuredTool with correct name', () => {
    expect(getHkDailyHistory.name).toBe('get_hk_daily_history');
  });
  test('getHkIncome is a DynamicStructuredTool with correct name', () => {
    expect(getHkIncome.name).toBe('get_hk_income');
  });
  test('getHkBalanceSheet is a DynamicStructuredTool with correct name', () => {
    expect(getHkBalanceSheet.name).toBe('get_hk_balance_sheet');
  });
  test('getHkCashflow is a DynamicStructuredTool with correct name', () => {
    expect(getHkCashflow.name).toBe('get_hk_cashflow');
  });
  test('getHkFinaIndicator is a DynamicStructuredTool with correct name', () => {
    expect(getHkFinaIndicator.name).toBe('get_hk_fina_indicator');
  });
  test('getHkHold is a DynamicStructuredTool with correct name', () => {
    expect(getHkHold.name).toBe('get_hk_hold');
  });
});
