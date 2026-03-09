#!/usr/bin/env bun
import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { Agent } from './agent/agent.js';
import { InMemoryChatHistory } from './utils/in-memory-chat-history.js';

const model = process.env.DEFAULT_MODEL || 'deepseek-chat';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory session store
const sessions = new Map<string, { history: InMemoryChatHistory; lastAccess: number }>();

function getOrCreateSession(sessionId: string): InMemoryChatHistory {
  const now = Date.now();
  let session = sessions.get(sessionId);
  if (!session) {
    session = { history: new InMemoryChatHistory(model), lastAccess: now };
    sessions.set(sessionId, session);
  }
  session.lastAccess = now;
  return session.history;
}

// Periodic cleanup of expired sessions (every hour)
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastAccess > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}, 60 * 60 * 1000);

export function createMcpServer() {
  const server = new McpServer({
    name: 'akshare-dexter',
    version: '1.0.0',
  });

  server.tool(
    'research',
    'Run Dexter autonomous financial research agent. Accepts a natural language query, runs multi-step planning, tool calling, validation, and returns a complete research report. Supports multi-turn conversations via session_id. IMPORTANT: This tool typically takes 30-60 seconds to complete. Please inform the user to wait before calling this tool.',
    {
      query: z.string().describe('Natural language research query (e.g. "Analyze Kweichow Moutai revenue trend over the last 3 years")'),
      session_id: z.string().describe('Session identifier for multi-turn context (e.g. user ID or chat ID)'),
    },
    async (args) => {
      const RESEARCH_TIMEOUT_MS = 5 * 60 * 1000;
      const history = getOrCreateSession(args.session_id);

      history.saveUserQuery(args.query);

      const agent = await Agent.create({
        model,
        maxIterations: 10,
      });

      let answer = '';
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Research timed out after 5 minutes')), RESEARCH_TIMEOUT_MS)
      );
      const research = async () => {
        for await (const event of agent.run(args.query, history)) {
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

      const finalAnswer = answer || 'No answer generated.';
      await history.saveAnswer(finalAnswer);

      return { content: [{ type: 'text' as const, text: finalAnswer }] };
    },
  );

  return server;
}

// Only start stdio transport when run directly (not imported)
const isDirectRun = process.argv[1]?.endsWith('mcp-server.ts') || process.argv[1]?.endsWith('mcp-server.js');
if (isDirectRun) {
  const server = createMcpServer();
  process.stderr.write(`[akshare-dexter] MCP server ready. Tool: research\n`);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
