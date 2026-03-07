// src/tools/tushare/stock-price.test.ts
import { describe, test, expect } from 'bun:test';
import { getCnStockPrice, getCnStockPrices, getCnStockBasic } from './stock-price.js';

describe('tushare stock price tools', () => {
  test('getCnStockPrice is a DynamicStructuredTool with correct name', () => {
    expect(getCnStockPrice.name).toBe('get_cn_stock_price');
  });
  test('getCnStockPrices is a DynamicStructuredTool with correct name', () => {
    expect(getCnStockPrices.name).toBe('get_cn_stock_prices');
  });
  test('getCnStockBasic is a DynamicStructuredTool with correct name', () => {
    expect(getCnStockBasic.name).toBe('get_cn_stock_basic');
  });
});
