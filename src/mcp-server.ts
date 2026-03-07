#!/usr/bin/env bun
import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getToolRegistry } from './tools/registry.js';

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
    async (args) => {
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

process.stderr.write(`[akshare-dexter] MCP server ready. Tools: ${exposed.join(', ')}\n`);

const transport = new StdioServerTransport();
await server.connect(transport);
