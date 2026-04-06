# AI Gateway — 新工作区部署指南

## 概览

本项目是基于 Replit 的 AI 透明代理网关，支持 OpenAI、Anthropic、Gemini、OpenRouter 四个供应商的完整 API 转发（含流式 SSE）。

---

## 一键部署步骤

### 第一步：从 GitHub 导入

在 Replit 中选择「Import from GitHub」，粘贴本项目仓库地址，创建新工作区。

导入完成后，`scripts/post-merge.sh` 会**自动**执行以下操作：
- `pnpm install` — 安装所有依赖
- `pnpm --filter @workspace/api-server run build` — 构建 API Server

---

### 第二步：粘贴以下指令到 Agent（唯一手动步骤）

复制下方完整内容，粘贴到新工作区的 **Agent 对话框**，Agent 会自动完成所有配置：

```
请完成以下 AI 网关初始化，按顺序执行：

1. 依次调用 setupReplitAIIntegrations 激活四个 AI 集成：

OpenAI: providerSlug="openai", providerUrlEnvVarName="AI_INTEGRATIONS_OPENAI_BASE_URL", providerApiKeyEnvVarName="AI_INTEGRATIONS_OPENAI_API_KEY"

Anthropic: providerSlug="anthropic", providerUrlEnvVarName="AI_INTEGRATIONS_ANTHROPIC_BASE_URL", providerApiKeyEnvVarName="AI_INTEGRATIONS_ANTHROPIC_API_KEY"

Gemini: providerSlug="gemini", providerUrlEnvVarName="AI_INTEGRATIONS_GEMINI_BASE_URL", providerApiKeyEnvVarName="AI_INTEGRATIONS_GEMINI_API_KEY"

OpenRouter: providerSlug="openrouter", providerUrlEnvVarName="AI_INTEGRATIONS_OPENROUTER_BASE_URL", providerApiKeyEnvVarName="AI_INTEGRATIONS_OPENROUTER_API_KEY"

2. 生成一个随机 API Key 并保存为环境变量：
   - 使用 crypto.randomBytes(32).toString("hex") 生成，前缀加 "gw-"
   - 调用 setEnvVars 保存为 GATEWAY_API_KEY（shared 环境）
   - 把生成的 Key 值打印出来告诉我

3. 配置并启动工作流：
   - 名称："API Server"，命令："PORT=8080 pnpm --filter @workspace/api-server run dev"，waitForPort: 8080，outputType: "console"

4. 完成后用 curl 测试 /api/healthz 确认服务正常运行。
```

执行完毕后，Agent 会输出你的 `GATEWAY_API_KEY`，请妥善保存。

---

## 验证服务

```bash
# 获取外部域名
echo $REPLIT_DOMAINS

# 健康检查（无需 Key）
curl https://YOUR_DOMAIN/api/healthz

# OpenAI 测试
curl -X POST https://YOUR_DOMAIN/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_GATEWAY_API_KEY" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hello"}],"max_tokens":10}'

# Anthropic 测试
curl -X POST https://YOUR_DOMAIN/v1/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_GATEWAY_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model":"claude-sonnet-4-5","max_tokens":10,"messages":[{"role":"user","content":"Hello"}]}'

# Gemini 测试
curl -X POST "https://YOUR_DOMAIN/v1beta/models/gemini-2.0-flash:generateContent" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_GATEWAY_API_KEY" \
  -d '{"contents":[{"role":"user","parts":[{"text":"Hello"}]}]}'

# OpenRouter 测试
curl -X POST https://YOUR_DOMAIN/openrouter/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_GATEWAY_API_KEY" \
  -d '{"model":"openai/gpt-4o-mini","messages":[{"role":"user","content":"Hello"}],"max_tokens":10}'
```

---

## API 端点速查

| 端点 | 说明 | 鉴权 |
|---|---|---|
| `GET /api/healthz` | 健康检查 | 无需 Key |
| `POST /v1/chat/completions` | OpenAI 聊天 | 需要 Key |
| `POST /v1/responses` | OpenAI Responses API | 需要 Key |
| `POST /v1/messages` | Anthropic 消息 | 需要 Key |
| `POST /v1beta/models/{model}:generateContent` | Gemini 生成 | 需要 Key |
| `POST /v1beta/models/{model}:streamGenerateContent` | Gemini 流式生成 | 需要 Key |
| `POST /openrouter/v1/chat/completions` | OpenRouter 聊天 | 需要 Key |

所有 AI 端点需在请求头携带：
```
Authorization: Bearer YOUR_GATEWAY_API_KEY
```

---

## 生产发布

服务验证正常后，在 Replit 点击「Publish」发布，填写子域名，Run command 填写：

```
PORT=8080 node --enable-source-maps artifacts/api-server/dist/index.mjs
```

发布后得到固定域名 `xxx.replit.app`，24 小时持续运行。

---

## 路径转发映射

| 外部请求 | 转发目标 |
|---|---|
| `POST /v1/chat/completions` | `modelfarm/openai/chat/completions` |
| `POST /v1/responses` | `modelfarm/openai/responses` |
| `POST /v1/messages` | `modelfarm/anthropic/v1/messages` |
| `POST /v1beta/models/{m}:generateContent` | `modelfarm/gemini/models/{m}:generateContent` |
| `POST /v1beta/models/{m}:streamGenerateContent` | `modelfarm/gemini/models/{m}:streamGenerateContent` |
| `POST /openrouter/v1/chat/completions` | `modelfarm/openrouter/chat/completions` |

外部客户端的 API Key 会被自动替换为 Replit 内置密钥，无需真实 Key。

---

## 支持特性

- ✅ 普通对话（非流式）
- ✅ 流式输出（SSE `stream: true`）
- ✅ 思考模式（Claude thinking blocks）
- ✅ 多模态（图片输入）
- ✅ 自定义工具（tool_use / function_calling）
- ✅ 所有请求头透传（anthropic-beta 等）
- ✅ 查询参数透传
- ✅ API Key 鉴权
