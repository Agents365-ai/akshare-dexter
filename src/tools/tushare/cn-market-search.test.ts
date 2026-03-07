import { describe, test, expect } from 'bun:test';
import { createCnMarketSearch, CN_MARKET_SEARCH_DESCRIPTION } from './cn-market-search.js';

describe('cn_market_search meta-tool', () => {
  test('creates a tool with correct name', () => {
    const tool = createCnMarketSearch('gpt-5.4');
    expect(tool.name).toBe('cn_market_search');
  });

  test('description is non-empty', () => {
    expect(CN_MARKET_SEARCH_DESCRIPTION.length).toBeGreaterThan(100);
  });
});
