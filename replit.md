# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI Proxy**: OpenAI, Anthropic, Gemini forwarded via Replit AI Integrations (modelfarm)

## AI Proxy

The API server (`artifacts/api-server`) includes an AI proxy layer at `src/routes/proxy.ts` that transparently forwards requests to the Replit AI modelfarm backend.

### Path Mappings

| External path | Forwarded to |
|---|---|
| `POST /v1/chat/completions` | `localhost:1106/modelfarm/openai/chat/completions` |
| `POST /v1/responses` | `localhost:1106/modelfarm/openai/responses` |
| `POST /v1/messages` | `localhost:1106/modelfarm/anthropic/v1/messages` |
| `POST /v1beta/models/{model}:generateContent` | `localhost:1106/modelfarm/gemini/models/{model}:generateContent` |
| `POST /v1beta/models/{model}:streamGenerateContent` | `localhost:1106/modelfarm/gemini/models/{model}:streamGenerateContent` |

### Authentication Header Replacement

External auth headers are stripped and replaced with the built-in AI integration key:

| Provider | External header | Replaced with |
|---|---|---|
| OpenAI | `Authorization: Bearer xxx` | Built-in `AI_INTEGRATIONS_OPENAI_API_KEY` |
| Anthropic | `x-api-key: xxx` | Built-in `AI_INTEGRATIONS_ANTHROPIC_API_KEY` |
| Gemini | `x-goog-api-key: xxx` | Built-in `AI_INTEGRATIONS_GEMINI_API_KEY` |

All request/response bodies are transparently passed through. Streaming (SSE) is fully supported for all providers.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
