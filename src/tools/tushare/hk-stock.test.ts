import { describe, test, expect } from 'bun:test';
import { getHkStockList, getHkDaily, getHkDailyHistory } from './hk-stock.js';

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
});
