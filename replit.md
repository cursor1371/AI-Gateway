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

The API server (`artifacts/api-server`) includes an AI proxy layer at `src/routes/proxy.ts` that transparently forwards requests to the Replit AI modelfarm backend. Proxy routes use native provider API formats and are protected by `GATEWAY_API_KEY`. The proxy router is mounted at root (`/`) in `app.ts`; registered production paths are `/v1`, `/v1beta`, `/openrouter`.

### Path Mappings

| Provider | External path | Internal (modelfarm) |
|---|---|---|
| OpenAI | `POST /v1/chat/completions` | `/modelfarm/openai/chat/completions` |
| OpenAI | `POST /v1/responses` | `/modelfarm/openai/responses` |
| Anthropic | `POST /v1/messages` | `/modelfarm/anthropic/v1/messages` |
| Gemini | `POST /v1beta/models/{model}:generateContent` | `/modelfarm/gemini/models/{model}:generateContent` |
| Gemini | `POST /v1beta/models/{model}:streamGenerateContent` | `/modelfarm/gemini/models/{model}:streamGenerateContent` |
| OpenRouter | `POST /openrouter/v1/chat/completions` | `/modelfarm/openrouter/chat/completions` |

### Authentication

Gateway clients must send `GATEWAY_API_KEY` in any of:
- `Authorization: Bearer <key>`
- `x-api-key: <key>`
- `x-goog-api-key: <key>`

Provider credentials are injected server-side:

| Provider | Injected header | Env var |
|---|---|---|
| OpenAI | `Authorization: Bearer xxx` | `AI_INTEGRATIONS_OPENAI_API_KEY` |
| Anthropic | `x-api-key: xxx` | `AI_INTEGRATIONS_ANTHROPIC_API_KEY` |
| Gemini | `x-goog-api-key: xxx` | `AI_INTEGRATIONS_GEMINI_API_KEY` |
| OpenRouter | `Authorization: Bearer xxx` | `AI_INTEGRATIONS_OPENROUTER_API_KEY` |

All request/response bodies are transparently passed through. Streaming (SSE) is fully supported for all providers.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
