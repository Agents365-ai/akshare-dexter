// src/tools/tushare/market-ref.test.ts
import { describe, test, expect } from 'bun:test';
import { getNorthboundFlow, getMarginData, getBlockTrade, getLimitList } from './market-ref.js';

describe('tushare market reference tools', () => {
  test('getNorthboundFlow has correct name', () => {
    expect(getNorthboundFlow.name).toBe('get_northbound_flow');
  });
  test('getMarginData has correct name', () => {
    expect(getMarginData.name).toBe('get_margin_data');
  });
  test('getBlockTrade has correct name', () => {
    expect(getBlockTrade.name).toBe('get_block_trade');
  });
  test('getLimitList has correct name', () => {
    expect(getLimitList.name).toBe('get_limit_list');
  });
});
