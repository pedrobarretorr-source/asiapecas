type ChatCompletionRequest = {
  model?: string;
  messages: Array<Record<string, unknown>>;
  stream?: boolean;
  tools?: Array<Record<string, unknown>>;
  tool_choice?: Record<string, unknown>;
  response_format?: Record<string, unknown>;
  temperature?: number;
  max_tokens?: number;
};

function normalizeModelName(model: string): string {
  return model.startsWith("openai/") ? model.slice("openai/".length) : model;
}

export function requireOpenAIKey(): string {
  const apiKey = Deno.env.get("MINIMAX_API_KEY");
  if (!apiKey) throw new Error("MINIMAX_API_KEY not configured");
  return apiKey;
}

export function resolveOpenAIModel(envVarName: string, fallback: string): string {
  return normalizeModelName(
    Deno.env.get(envVarName) ||
      Deno.env.get("MINIMAX_MODEL") ||
      fallback,
  );
}

export async function createOpenAIChatCompletion(
  request: ChatCompletionRequest,
): Promise<Response> {
  const apiKey = requireOpenAIKey();
  const body = {
    ...request,
    model: normalizeModelName(request.model || resolveOpenAIModel("MINIMAX_MODEL", "MiniMax-M2.5")),
  };

  return await fetch("https://api.minimax.io/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export function extractMessageContent(data: any): string {
  return data?.choices?.[0]?.message?.content || "";
}

export function extractToolArguments<T>(data: any): T | null {
  const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return null;

  try {
    return JSON.parse(args) as T;
  } catch {
    return null;
  }
}
