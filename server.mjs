#!/usr/bin/env node
/**
 * Plugsky MCP server — use all 36 Plugsky models, RAG knowledge, platform
 * tools and documents from any MCP client (Claude Desktop, Cursor, VS Code,
 * Windsurf, Zed…).
 *
 * Zero dependencies: speaks JSON-RPC 2.0 over stdio (MCP spec 2024-11-05).
 *
 * Tool groups (default: all):
 *   chat      plugsky_chat                            (API key)
 *   models    plugsky_models                          (API key)
 *   rag       plugsky_rag_collections, _rag_query     (dashboard login)
 *   usage     plugsky_usage                           (dashboard login)
 *   tools     plugsky_tools_list, plugsky_tools_run   (dashboard login · Builder+)
 *   files     plugsky_documents_list, _documents_ingest (dashboard login)
 *
 * Run:  PLUGSKY_API_KEY=sk-live-… node server.mjs
 *       PLUGSKY_API_KEY=sk-live-… node server.mjs --groups=rag
 * npx:  npx -y @plugsky/mcp
 *
 * Env:
 *   PLUGSKY_API_KEY    sk-live-… (required)            → /v1 inference + models
 *   PLUGSKY_EMAIL      account email   (optional)      → dashboard tools (RAG, usage, tools, files)
 *   PLUGSKY_PASSWORD   account password (optional)
 *   PLUGSKY_GROUPS     comma-separated group filter (same as --groups)
 *   PLUGSKY_BASE_URL   default https://api.plugsky.com/v1
 *   PLUGSKY_SITE_URL   default https://plugsky.com
 */
import { createInterface } from 'node:readline';

const API_KEY = process.env.PLUGSKY_API_KEY || '';
const BASE = (process.env.PLUGSKY_BASE_URL || 'https://api.plugsky.com/v1').replace(/\/+$/, '');
const SITE = (process.env.PLUGSKY_SITE_URL || 'https://plugsky.com').replace(/\/+$/, '');
const SERVER = { name: 'plugsky-mcp', version: '1.1.0' };

const argGroups = process.argv.find((a) => a.startsWith('--groups='));
const groupList = (argGroups ? argGroups.slice('--groups='.length) : process.env.PLUGSKY_GROUPS || 'chat,models,rag,usage,tools,files')
  .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
const GROUPS = new Set(groupList);

const INSTRUCTIONS =
  'Plugsky is an OpenAI-compatible AI platform: 36 models (free plugsky-micro / plugsky-lite, reasoning, vision, ' +
  'coder, long-context), one API key, unlimited usage on paid plans under fair-use RPM. Use plugsky_chat for any ' +
  'model, plugsky_models to see which alias fits a task, plugsky_rag_query to cite the user\'s own documents, and ' +
  'the files group to ingest new documents into a collection.';

if (!API_KEY) {
  process.stderr.write('plugsky-mcp: PLUGSKY_API_KEY is required\n');
  process.exit(1);
}

async function request(url, init) {
  const r = await fetch(url, init);
  const text = await r.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  if (!r.ok) {
    const msg = body?.error?.message || body?.message || `HTTP ${r.status}`;
    throw new Error(msg);
  }
  return body;
}

const api = (path, init = {}) => request(BASE + path, {
  ...init,
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}`, ...(init.headers || {}) },
});

let jwt = null;
async function dashboard(path, init = {}) {
  if (!jwt) {
    const email = process.env.PLUGSKY_EMAIL;
    const pass = process.env.PLUGSKY_PASSWORD;
    if (!email || !pass) {
      throw new Error('Set PLUGSKY_EMAIL and PLUGSKY_PASSWORD to use this tool (plugsky_chat / plugsky_models only need the API key).');
    }
    const d = await request(SITE + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
    });
    jwt = d.access_token || '';
    if (!jwt) throw new Error('Dashboard login failed — check PLUGSKY_EMAIL / PLUGSKY_PASSWORD.');
  }
  return request(SITE + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}`, ...(init.headers || {}) },
  });
}

const ALL_TOOLS = [
  {
    group: 'chat',
    name: 'plugsky_chat',
    description:
      'Chat with any Plugsky model (36 models incl. free plugsky-micro/plugsky-lite, reasoning, vision, coder, long-context). ' +
      'Returns the reply plus the model that actually served it. Supports vision via image_url content parts.',
    inputSchema: {
      type: 'object',
      properties: {
        model: { type: 'string', description: 'Alias: plugsky-lite, plugsky-pro, plugsky-frontier… (default plugsky-lite)' },
        messages: { type: 'array', items: { type: 'object' }, description: 'OpenAI-style messages' },
        temperature: { type: 'number' },
        max_tokens: { type: 'number' },
      },
      required: ['messages'],
    },
  },
  {
    group: 'models',
    name: 'plugsky_models',
    description: 'List every Plugsky model with tier, context window and capabilities.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    group: 'rag',
    name: 'plugsky_rag_collections',
    description: 'List Knowledge (RAG) collections with their IDs and document counts — call this first to get collection_id for plugsky_rag_query.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    group: 'rag',
    name: 'plugsky_rag_query',
    description: 'Semantic search over a Plugsky knowledge collection (RAG). Needs PLUGSKY_EMAIL/PASSWORD.',
    inputSchema: {
      type: 'object',
      properties: {
        collection_id: { type: 'number' },
        query: { type: 'string' },
        top_k: { type: 'number', description: 'default 5' },
      },
      required: ['collection_id', 'query'],
    },
  },
  {
    group: 'usage',
    name: 'plugsky_usage',
    description: 'Account usage: requests + tokens per day (needs PLUGSKY_EMAIL/PASSWORD).',
    inputSchema: { type: 'object', properties: { period_days: { type: 'string', description: 'e.g. 30d' } } },
  },
  {
    group: 'tools',
    name: 'plugsky_tools_list',
    description: 'List the Plugsky platform tools (pricing calculators, validators, generators…) available to call with plugsky_tools_run. Requires the function-calling scope (Builder plan or higher).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    group: 'tools',
    name: 'plugsky_tools_run',
    description: 'Run a Plugsky platform tool by id with an input object. Get ids from plugsky_tools_list. Requires the function-calling scope (Builder plan or higher).',
    inputSchema: {
      type: 'object',
      properties: {
        tool_id: { type: 'number' },
        input: { type: 'object', description: 'Tool input, e.g. {"amount": 1200, "currency": "USD"}' },
      },
      required: ['tool_id'],
    },
  },
  {
    group: 'files',
    name: 'plugsky_documents_list',
    description: 'List documents in your Knowledge (RAG) collections with parse status and chunk counts.',
    inputSchema: { type: 'object', properties: { collection_id: { type: 'number', description: 'optional filter' } } },
  },
  {
    group: 'files',
    name: 'plugsky_documents_ingest',
    description: 'Ingest a document into a Knowledge collection — from a public URL (file_url) or raw text. PDF text layers, images and scans (vision transcription) are parsed, embedded and become searchable via plugsky_rag_query.',
    inputSchema: {
      type: 'object',
      properties: {
        collection_id: { type: 'number' },
        name: { type: 'string', description: 'Display name for the document' },
        file_url: { type: 'string', description: 'Public URL of the file (PDF / image / scan)' },
        text: { type: 'string', description: 'Raw text (alternative to file_url)' },
      },
      required: ['collection_id', 'name'],
    },
  },
];

const TOOLS = ALL_TOOLS.filter((t) => GROUPS.has(t.group)).map(({ group, ...rest }) => rest);

function asJson(v) { return JSON.stringify(v, null, 2); }

async function callTool(name, args = {}) {
  switch (name) {
    case 'plugsky_chat': {
      const res = await api('/chat/completions', {
        method: 'POST',
        body: JSON.stringify({
          model: args.model || 'plugsky-lite',
          messages: args.messages,
          ...(args.temperature != null ? { temperature: args.temperature } : {}),
          ...(args.max_tokens != null ? { max_tokens: args.max_tokens } : {}),
        }),
      });
      const reply = res?.choices?.[0]?.message?.content ?? '';
      const served = res?.x_plugsky_served_model || res?.model || 'unknown';
      return `[served: ${served}]\n${reply}`;
    }
    case 'plugsky_models': {
      const res = await api('/models');
      const rows = (res.data || []).map((m) => {
        const d = m.plugsky || m;
        return `${m.id}\t${d.tier || '-'}\t${d.context_window || '-'}\t${(d.features || d.capabilities || []).join(',')}`;
      });
      return 'model\ttier\tcontext\tcapabilities\n' + rows.join('\n');
    }
    case 'plugsky_rag_collections': {
      const res = await dashboard('/api/rag/collections');
      const items = res.collections || res.data || res.items || [];
      if (!items.length) return 'No collections yet — create one in the dashboard (Knowledge → RAG).';
      return items.map((c) => `#${c.id}  ${c.name || '(unnamed)'}  docs=${c.document_count ?? c.documents_count ?? c.docs ?? '?'}`).join('\n');
    }
    case 'plugsky_rag_query': {
      const res = await dashboard('/api/rag/query', {
        method: 'POST',
        body: JSON.stringify({ collection_id: Number(args.collection_id), query: String(args.query), top_k: Number(args.top_k || 5) }),
      });
      const results = res.results || [];
      if (!results.length) return 'No matching chunks.';
      return results.map((r, i) =>
        `${i + 1}. [score ${Number(r.score || 0).toFixed(3)}] ${(r.content || '').trim()}`
      ).join('\n\n');
    }
    case 'plugsky_usage': {
      const res = await dashboard('/api/usage' + (args.period_days ? `?period=${encodeURIComponent(args.period_days)}` : ''));
      return asJson(res);
    }
    case 'plugsky_tools_list': {
      const res = await dashboard('/api/tools');
      const items = res.tools || res.data || res.items || [];
      if (!items.length) return 'No tools available on this plan (requires the function-calling scope — Builder plan or higher).';
      return items.map((t) => `#${t.id}  ${t.name}  ${t.method || 'HTTP'}  ${(t.description || '').slice(0, 90)}`).join('\n');
    }
    case 'plugsky_tools_run': {
      const res = await dashboard(`/api/tools/${Number(args.tool_id)}/test`, {
        method: 'POST',
        body: JSON.stringify({ input: args.input || {} }),
      });
      return asJson(res);
    }
    case 'plugsky_documents_list': {
      const q = args.collection_id ? `?collection_id=${Number(args.collection_id)}` : '';
      const res = await dashboard('/api/rag/documents' + q);
      const items = res.documents || res.data || res.items || [];
      if (!items.length) return 'No documents found.';
      return items.map((d) => `#${d.id}  ${d.name || d.filename || '(unnamed)'}  status=${d.status || '?'}  chunks=${d.chunk_count ?? d.chunks ?? '?'}`).join('\n');
    }
    case 'plugsky_documents_ingest': {
      const body = { collection_id: Number(args.collection_id), name: String(args.name) };
      if (args.file_url) body.file_url = String(args.file_url);
      if (args.text) body.text = String(args.text);
      if (!body.file_url && !body.text) throw new Error('Provide file_url or text.');
      const res = await dashboard('/api/rag/documents', { method: 'POST', body: JSON.stringify(body) });
      return 'Ingested:\n' + asJson(res);
    }
    default:
      throw new Error(`Unknown tool: ${name}. Available in this server: ${TOOLS.map((t) => t.name).join(', ')}`);
  }
}

/* ── Minimal MCP (JSON-RPC 2.0) over stdio ── */
const rl = createInterface({ input: process.stdin, terminal: false });
const send = (obj) => process.stdout.write(JSON.stringify(obj) + '\n');

rl.on('line', async (line) => {
  const raw = line.trim();
  if (raw === '') return;
  let msg;
  try { msg = JSON.parse(raw); } catch { return; }
  const { id, method, params } = msg;

  try {
    switch (method) {
      case 'initialize':
        send({
          jsonrpc: '2.0', id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: SERVER,
            instructions: INSTRUCTIONS,
          },
        });
        break;
      case 'notifications/initialized':
        break;
      case 'tools/list':
        send({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
        break;
      case 'tools/call': {
        try {
          const text = await callTool(params?.name, params?.arguments || {});
          send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: String(text) }] } });
        } catch (e) {
          send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true } });
        }
        break;
      }
      case 'ping':
        send({ jsonrpc: '2.0', id, result: {} });
        break;
      default:
        send({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } });
    }
  } catch (e) {
    send({ jsonrpc: '2.0', id, error: { code: -32603, message: e.message } });
  }
});
