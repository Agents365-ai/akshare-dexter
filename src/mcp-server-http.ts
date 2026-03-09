#!/usr/bin/env bun
import 'dotenv/config';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer } from './mcp-server.js';
import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

const PORT = parseInt(process.env.MCP_HTTP_PORT || '3100', 10);

// Track transports per MCP session (each with its own McpServer instance)
const transports = new Map<string, StreamableHTTPServerTransport>();

const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (url.pathname !== '/mcp') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  // Parse body for POST
  let body: unknown;
  if (req.method === 'POST') {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    body = JSON.parse(Buffer.concat(chunks).toString());
  }

  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  if (req.method === 'POST' && !sessionId) {
    // New session — create fresh McpServer + transport pair
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        transports.set(id, transport);
        process.stderr.write(`[akshare-dexter] HTTP session created: ${id}\n`);
      },
    });
    const server = createMcpServer();
    await server.connect(transport);
    await transport.handleRequest(req, res, body);
    return;
  }

  if (sessionId) {
    const transport = transports.get(sessionId);
    if (!transport) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Session not found' }));
      return;
    }
    await transport.handleRequest(req, res, body);

    if (req.method === 'DELETE') {
      transports.delete(sessionId);
      process.stderr.write(`[akshare-dexter] HTTP session closed: ${sessionId}\n`);
    }
    return;
  }

  res.writeHead(400);
  res.end(JSON.stringify({ error: 'Missing mcp-session-id header' }));
});

httpServer.listen(PORT, () => {
  process.stderr.write(`[akshare-dexter] MCP HTTP server listening on port ${PORT}\n`);
  process.stderr.write(`[akshare-dexter] Endpoint: http://localhost:${PORT}/mcp\n`);
});
