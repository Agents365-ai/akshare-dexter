// src/tools/tushare/news.ts
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { callTushare } from './api.js';
import { formatToolResult } from '../types.js';

const CnNewsSchema = z.object({
  src: z.string().optional().describe("News source filter, e.g. '新浪财经', '华尔街见闻', '同花顺', '第一财经'. If omitted, returns from all sources."),
  start_date: z.string().describe("Start datetime, format: 'YYYY-MM-DD HH:MM:SS', e.g. '2024-01-01 00:00:00'."),
  end_date: z.string().describe("End datetime, format: 'YYYY-MM-DD HH:MM:SS', e.g. '2024-01-02 00:00:00'."),
});

export const getCnNews = new DynamicStructuredTool({
  name: 'get_cn_news',
  description: 'Retrieves Chinese financial news from major sources (新浪财经, 华尔街见闻, 同花顺, 第一财经, 财新, etc.). Returns title, content, publication time, and source.',
  schema: CnNewsSchema,
  func: async (input) => {
    const params = {
      src: input.src,
      start_date: input.start_date,
      end_date: input.end_date,
    };
    const fields = ['datetime', 'title', 'content', 'src'];
    const { data, url } = await callTushare('major_news', params, fields);
    return formatToolResult(data, [url]);
  },
});
