# Plugsky MCP

**Every AI model — one API — over the Model Context Protocol.**

- 🌐 **Remote (recommended):** `https://plugsky.com/mcp` (Streamable-HTTP, Bearer auth — get a key at https://plugsky.com/dashboard)
- 💻 **Local:** `npx -y @plugsky/mcp` (Claude Desktop, Cursor, Windsurf, VS Code, Zed)
- 🔐 **OAuth 2.1 + Dynamic Client Registration:** discovery at `https://plugsky.com/.well-known/oauth-authorization-server`

## Live tools (validated)

| Tool | What it does |
|---|---|
| `plugsky_chat` | Chat with any Plugsky model (36+ aliases, 7-tier provider failover) |
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
