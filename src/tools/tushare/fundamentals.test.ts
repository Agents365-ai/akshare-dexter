// src/tools/tushare/fundamentals.test.ts
import { describe, test, expect } from 'bun:test';
import { getCnIncome, getCnBalanceSheet, getCnCashflow, getCnFinaIndicator } from './fundamentals.js';

describe('tushare fundamentals tools', () => {
  test('getCnIncome has correct name', () => {
    expect(getCnIncome.name).toBe('get_cn_income');
  });
  test('getCnBalanceSheet has correct name', () => {
    expect(getCnBalanceSheet.name).toBe('get_cn_balance_sheet');
  });
  test('getCnCashflow has correct name', () => {
    expect(getCnCashflow.name).toBe('get_cn_cashflow');
  });
  test('getCnFinaIndicator has correct name', () => {
    expect(getCnFinaIndicator.name).toBe('get_cn_fina_indicator');
  });
});
