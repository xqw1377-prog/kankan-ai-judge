/** Gateway adapter. Domain validation does not live here. */

export const ANALYSIS_PROVIDER = "lovable-gateway";
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

export const VISUAL_UNCERTAINTY = "视觉估算，份量和用油没有测量。";

export interface ProviderSuccess {
  ok: true;
  requestId: string;
  provider: string;
  model: string;
  latencyMs: number;
  arguments: string;
}

export interface ProviderFailure {
  ok: false;
  requestId: string;
  provider: string;
  model: string;
  latencyMs: number;
  status: number;
  error: string;
}

export type ProviderResult = ProviderSuccess | ProviderFailure;

function logCall(entry: {
  requestId: string;
  model: string;
  latencyMs: number;
  status: string;
  http: number;
}) {
  console.log(JSON.stringify({
    requestId: entry.requestId,
    provider: ANALYSIS_PROVIDER,
    model: entry.model,
    latencyMs: entry.latencyMs,
    status: entry.status,
    http: entry.http,
  }));
}

/** Calls the current gateway. Logs id, latency, model, and status only. */
export async function completeToolCall(input: {
  model: string;
  messages: unknown;
  tools: unknown;
  toolChoice: unknown;
}): Promise<ProviderResult> {
  const requestId = crypto.randomUUID();
  const started = Date.now();
  const model = input.model;
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) {
    const latencyMs = Date.now() - started;
    logCall({ requestId, model, latencyMs, status: "missing_key", http: 500 });
    return {
      ok: false,
      requestId,
      provider: ANALYSIS_PROVIDER,
      model,
      latencyMs,
      status: 500,
      error: "LOVABLE_API_KEY is not configured",
    };
  }

  let response: Response;
  try {
    response = await fetch(GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: input.messages,
        tools: input.tools,
        tool_choice: input.toolChoice,
      }),
    });
  } catch {
    const latencyMs = Date.now() - started;
    logCall({ requestId, model, latencyMs, status: "unavailable", http: 503 });
    return {
      ok: false,
      requestId,
      provider: ANALYSIS_PROVIDER,
      model,
      latencyMs,
      status: 503,
      error: "分析服务暂时不可用",
    };
  }

  const latencyMs = Date.now() - started;
  if (!response.ok) {
    logCall({
      requestId,
      model,
      latencyMs,
      status: "error",
      http: response.status,
    });
    return {
      ok: false,
      requestId,
      provider: ANALYSIS_PROVIDER,
      model,
      latencyMs,
      status: response.status === 429 ? 429 : 503,
      error: response.status === 429 ? "请求太频繁，请稍后再试" : "分析服务暂时不可用",
    };
  }

  const data = await response.json();
  const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (typeof args !== "string" || args.trim() === "") {
    logCall({ requestId, model, latencyMs, status: "empty", http: 422 });
    return {
      ok: false,
      requestId,
      provider: ANALYSIS_PROVIDER,
      model,
      latencyMs,
      status: 422,
      error: "没能识别这餐",
    };
  }

  logCall({ requestId, model, latencyMs, status: "ok", http: 200 });
  return {
    ok: true,
    requestId,
    provider: ANALYSIS_PROVIDER,
    model,
    latencyMs,
    arguments: args,
  };
}
