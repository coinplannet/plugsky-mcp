# Plugsky MCP

[![Plugsky MCP on Glama](https://glama.ai/mcp/servers/com.plugsky/plugsky-mcp/badge)](https://glama.ai/mcp/connectors/com.plugsky/plugsky-mcp)

**Every AI model — one API — over the Model Context Protocol.**

- 🌐 **Remote (recommended):** `https://plugsky.com/mcp` (Streamable-HTTP, Bearer auth — get a key at https://plugsky.com/dashboard)
- 💻 **Local:** `npx -y @plugsky/mcp` (Claude Desktop, Cursor, Windsurf, VS Code, Zed)
- 🔐 **OAuth 2.1 + Dynamic Client Registration:** discovery at `https://plugsky.com/.well-known/oauth-authorization-server`

## Live tools (validated)

| Tool | What it does |
|---|---|
| `plugsky_chat` | Chat with any Plugsky model (39 model IDs, 7-tier provider failover) |
| `plugsky_models` | Full model catalog incl. per-alias backups |
| `plugsky_fusion` | Multi-model fan-out / fusion |
| `plugsky_web_search` | Real-time web search |
| `plugsky_web_fetch` | Clean markdown/page fetch |
| `plugsky_youtube_transcript` | Video transcripts (real captions) |
| `plugsky_audio_ingest` | Audio → text (Whisper pipeline) |
| `plugsky_memory_save` / `plugsky_memory_search` | Persistent account memory |
| `plugsky_browse` | Browse pages, extract text + links |
| `plugsky_code_run` | Sandboxed Python (no network, 256MB, 30s) |

Plus **12 prompts** (rag-cite, model-compare, doc-summarize, …) and **10 resources** (`plugsky://models`, `plugsky://pricing`, …).

## Quickstart (remote)

```json
{ "mcpServers": { "plugsky": {
  "type": "http",
  "url": "https://plugsky.com/mcp",
  "headers": { "Authorization": "Bearer YOUR_PLUGSKY_API_KEY" }
}}}
```

Docs & directory: https://plugsky.com/dashboard#mcp

## Source

This repository contains the stdio bridge source (`server.mjs`) published as [`@plugsky/mcp`](https://www.npmjs.com/package/@plugsky/mcp) under the MIT license. The hosted remote endpoint is `https://plugsky.com/mcp`; the stdio bridge is for clients that cannot use a remote MCP server.


## Enterprise API and deployment

The MCP server uses the same OpenAI-compatible API base as the HTTP API: `https://api.plugsky.com/v1`. Flat plans Builder ($60/mo) and Scale ($120/mo) have no monthly token cap and no per-token overage; annual billing saves 20%, first month is 30% off capped at $20, and there is a 7-day guarantee. Private deployment is by contract in Virginia, Frankfurt, UAE and Singapore, with Riyadh on Enterprise only. Security work is aligned with SOC 2 and ISO 27001 practices; Plugsky does not hold those certifications, documentation is under NDA, and there is no FedRAMP authorization.

- Enterprise AI API package: https://plugsky.com/enterprise/ai-api-package
- Sovereign AI package: https://plugsky.com/enterprise/sovereign-ai-package
- Enterprise AI API verification checklist: https://plugsky.com/articles/enterprise-ai-api-verification-checklist
- Enterprise AI platform comparison (2027): https://plugsky.com/best/enterprise-ai-platform-2027
