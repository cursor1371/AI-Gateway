import { useState, useEffect, useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface HealthStatus {
  status: string;
}

interface Provider {
  name: string;
  slug: string;
  icon: string;
  endpoints: { method: string; external: string; internal: string }[];
}

const PROVIDERS: Provider[] = [
  {
    name: "OpenAI",
    slug: "openai",
    icon: "🤖",
    endpoints: [
      { method: "POST", external: "/v1/chat/completions", internal: "/modelfarm/openai/chat/completions" },
      { method: "POST", external: "/v1/responses", internal: "/modelfarm/openai/responses" },
    ],
  },
  {
    name: "Anthropic",
    slug: "anthropic",
    icon: "🧠",
    endpoints: [
      { method: "POST", external: "/v1/messages", internal: "/modelfarm/anthropic/v1/messages" },
    ],
  },
  {
    name: "Gemini",
    slug: "gemini",
    icon: "✨",
    endpoints: [
      { method: "POST", external: "/v1beta/models/{model}:generateContent", internal: "/modelfarm/gemini/models/{model}:generateContent" },
      { method: "POST", external: "/v1beta/models/{model}:streamGenerateContent", internal: "/modelfarm/gemini/models/{model}:streamGenerateContent" },
    ],
  },
  {
    name: "OpenRouter",
    slug: "openrouter",
    icon: "🔀",
    endpoints: [
      { method: "POST", external: "/openrouter/v1/chat/completions", internal: "/modelfarm/openrouter/chat/completions" },
    ],
  },
];

function HealthBadge({ status }: { status: "ok" | "error" | "loading" }) {
  const map = {
    ok: { label: "Healthy", className: "bg-green-100 text-green-800 border border-green-200" },
    error: { label: "Unreachable", className: "bg-red-100 text-red-800 border border-red-200" },
    loading: { label: "Checking…", className: "bg-yellow-100 text-yellow-800 border border-yellow-200 animate-pulse" },
  };
  const { label, className } = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === "ok" ? "bg-green-500" : status === "error" ? "bg-red-500" : "bg-yellow-400"}`} />
      {label}
    </span>
  );
}

function Dashboard() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthStatus, setHealthStatus] = useState<"ok" | "error" | "loading">("loading");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [responseTime, setResponseTime] = useState<number | null>(null);

  const checkHealth = useCallback(async () => {
    setIsRefreshing(true);
    setHealthStatus("loading");
    const start = performance.now();
    try {
      const res = await fetch(`${BASE}/api/healthz`);
      const elapsed = Math.round(performance.now() - start);
      setResponseTime(elapsed);
      if (res.ok) {
        const data: HealthStatus = await res.json();
        setHealth(data);
        setHealthStatus("ok");
      } else {
        setHealthStatus("error");
      }
    } catch {
      setHealthStatus("error");
      setResponseTime(null);
    } finally {
      setLastChecked(new Date());
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const id = setInterval(checkHealth, 30000);
    return () => clearInterval(id);
  }, [checkHealth]);

  const totalEndpoints = PROVIDERS.reduce((acc, p) => acc + p.endpoints.length, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white text-sm font-bold shadow">
              G
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground">AI Gateway</h1>
              <p className="text-xs text-muted-foreground">Unified AI provider proxy</p>
            </div>
          </div>
          <HealthBadge status={healthStatus} />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Gateway Status</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-foreground">
                {healthStatus === "loading" ? "—" : health?.status ?? "error"}
              </span>
            </div>
            {lastChecked && (
              <p className="text-xs text-muted-foreground mt-1">
                Last checked {lastChecked.toLocaleTimeString()}
              </p>
            )}
          </div>

          <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Response Time</p>
            <div className="flex items-end gap-1">
              <span className="text-2xl font-bold text-foreground">
                {responseTime !== null ? responseTime : "—"}
              </span>
              {responseTime !== null && <span className="text-sm text-muted-foreground mb-0.5">ms</span>}
            </div>
            <p className="text-xs text-muted-foreground mt-1">/api/healthz</p>
          </div>

          <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Providers / Endpoints</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-foreground">{PROVIDERS.length}</span>
              <span className="text-sm text-muted-foreground mb-0.5">/ {totalEndpoints}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">OpenAI · Anthropic · Gemini · OpenRouter</p>
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Proxy Endpoint Map</h2>
            <span className="text-xs text-muted-foreground">Native API format · Auth: <code className="font-mono">Authorization: Bearer &lt;key&gt;</code></span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-5 py-2.5 text-left font-medium text-muted-foreground">Provider</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Method</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">External Path</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground hidden lg:table-cell">Internal Path</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {PROVIDERS.flatMap((p) =>
                  p.endpoints.map((ep, i) => (
                    <tr key={`${p.slug}-${i}`} className="hover:bg-muted/30 transition-colors">
                      {i === 0 ? (
                        <td
                          className="px-5 py-3 font-medium text-foreground align-top"
                          rowSpan={p.endpoints.length}
                        >
                          <div className="flex items-center gap-2">
                            <span>{p.icon}</span>
                            <span>{p.name}</span>
                          </div>
                        </td>
                      ) : null}
                      <td className="px-4 py-3">
                        <span className="inline-block rounded px-1.5 py-0.5 font-bold font-mono bg-purple-100 text-purple-700">
                          {ep.method}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-foreground">{ep.external}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground hidden lg:table-cell">{ep.internal}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Authentication</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              All proxy endpoints require the gateway API key. Provider credentials are injected automatically server-side.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              {[
                { label: "OpenAI / OpenRouter", header: "Authorization: Bearer <key>" },
                { label: "Anthropic", header: "x-api-key: <key>" },
                { label: "Gemini", header: "x-goog-api-key: <key>" },
              ].map((item) => (
                <div key={item.label} className="bg-muted rounded-lg p-3">
                  <p className="text-muted-foreground mb-1 font-sans text-xs font-medium">{item.label}</p>
                  <p className="text-foreground break-all">{item.header}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Auto-refreshes every 30s</p>
          <button
            onClick={checkHealth}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm"
          >
            {isRefreshing ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Checking…
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  );
}

export default App;
