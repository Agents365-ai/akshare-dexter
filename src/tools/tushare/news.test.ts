// src/tools/tushare/news.test.ts
import { describe, test, expect } from 'bun:test';
import { getCnNews } from './news.js';

describe('tushare news tools', () => {
  test('getCnNews has correct name', () => {
    expect(getCnNews.name).toBe('get_cn_news');
  });
});
