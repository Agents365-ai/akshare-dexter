// src/tools/tushare/concept.ts
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { callTushare } from './api.js';
import { formatToolResult } from '../types.js';

export const getConceptList = new DynamicStructuredTool({
  name: 'get_concept_list',
  description: 'Retrieves the list of all concept/theme sectors (概念板块) from Tonghuashun. Each concept has an ID, name, and stock count. Use concept IDs with get_concept_stocks to find constituent stocks.',
  schema: z.object({
    src: z.enum(['ts']).default('ts').describe("Data source. Default 'ts' (Tonghuashun)."),
  }),
  func: async (input) => {
    const { data, url } = await callTushare('concept', { src: input.src });
    return formatToolResult(data, [url]);
  },
});

const ConceptStocksSchema = z.object({
  id: z.string().describe("Concept ID from get_concept_list, e.g. 'TS2' for a specific concept."),
  ts_code: z.string().optional().describe("Filter by specific stock code."),
});

export const getConceptStocks = new DynamicStructuredTool({
  name: 'get_concept_stocks',
  description: 'Retrieves the list of stocks belonging to a specific concept/theme sector. Use get_concept_list first to find concept IDs.',
  schema: ConceptStocksSchema,
  func: async (input) => {
    const params = {
      id: input.id,
      ts_code: input.ts_code?.trim().toUpperCase(),
    };
    const { data, url } = await callTushare('concept_detail', params);
    return formatToolResult(data, [url]);
  },
});
