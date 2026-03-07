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
