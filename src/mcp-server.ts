#!/usr/bin/env bun
import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { getToolRegistry } from './tools/registry.js';
import { Agent } from './agent/agent.js';

const EXCLUDED_TOOLS = new Set([
  'browser',    // Stateful Playwright session, not suitable for MCP
  'read_file',  // Filesystem access - security concern
  'write_file',
  'edit_file',
  'heartbeat',  // Internal gateway tool
  'skill',      // Dexter-internal skill system
]);

const model = process.env.DEFAULT_MODEL || 'deepseek-chat';

const server = new McpServer({
  name: 'akshare-dexter',
  version: '1.0.0',
});

const registry = getToolRegistry(model);
const exposed: string[] = [];

for (const entry of registry) {
  if (EXCLUDED_TOOLS.has(entry.name)) continue;

  const tool = entry.tool;

  server.tool(
    entry.name,
    entry.description,
    (tool.schema as any).shape,
    async (args: Record<string, unknown>) => {
      try {
        const result = await tool.invoke(args);
        const text = typeof result === 'string' ? result : JSON.stringify(result);
        return { content: [{ type: 'text' as const, text }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: message }) }],
          isError: true,
        };
      }
    },
  );
  exposed.push(entry.name);
}

// Research tool: full agent loop via MCP
server.tool(
  'research',
  'Run Dexter autonomous financial research agent. Accepts a natural language query, plans tasks, calls tools, validates results, and returns a complete research report. Use this for complex multi-step analysis instead of calling individual tools.',
  { query: z.string().describe('Natural language research query (e.g. "Analyze Apple revenue trend over the last 3 years")'), model: z.string().optional().describe('LLM model to use (defaults to server default)') },
  async (args) => {
    const RESEARCH_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
    const agent = await Agent.create({
      model: args.model || model,
      maxIterations: 10,
    });
    let answer = '';
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Research timed out after 5 minutes')), RESEARCH_TIMEOUT_MS)
    );
    const research = async () => {
      for await (const event of agent.run(args.query)) {
        if (event.type === 'done') answer = event.answer;
      }
      return answer;
    };
    try {
      await Promise.race([research(), timeout]);
    } catch (err) {
      if (!answer) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true };
      }
    }
    return { content: [{ type: 'text' as const, text: answer || 'No answer generated.' }] };
  },
);
exposed.push('research');

process.stderr.write(`[akshare-dexter] MCP server ready. Tools: ${exposed.join(', ')}\n`);

const transport = new StdioServerTransport();
await server.connect(transport);
