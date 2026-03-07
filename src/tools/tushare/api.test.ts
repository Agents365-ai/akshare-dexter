import { describe, test, expect } from 'bun:test';
import { transformTushareResponse } from './api.js';

describe('transformTushareResponse', () => {
  test('converts tabular response to object array', () => {
    const raw = {
      fields: ['ts_code', 'trade_date', 'close'],
      items: [
        ['000001.SZ', '20240101', 10.5],
        ['000001.SZ', '20240102', 10.8],
      ],
    };
    const result = transformTushareResponse(raw);
    expect(result).toEqual([
      { ts_code: '000001.SZ', trade_date: '20240101', close: 10.5 },
      { ts_code: '000001.SZ', trade_date: '20240102', close: 10.8 },
    ]);
  });

  test('returns empty array when items is null', () => {
    const raw = { fields: ['ts_code'], items: null };
    const result = transformTushareResponse(raw);
    expect(result).toEqual([]);
  });

  test('returns empty array when fields is empty', () => {
    const raw = { fields: [], items: [] };
    const result = transformTushareResponse(raw);
    expect(result).toEqual([]);
  });
});
