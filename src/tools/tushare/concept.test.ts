// src/tools/tushare/concept.test.ts
import { describe, test, expect } from 'bun:test';
import { getConceptList, getConceptStocks } from './concept.js';

describe('tushare concept tools', () => {
  test('getConceptList has correct name', () => {
    expect(getConceptList.name).toBe('get_concept_list');
  });
  test('getConceptStocks has correct name', () => {
    expect(getConceptStocks.name).toBe('get_concept_stocks');
  });
});
