const AI_API_KEY = process.env.AI_API_KEY;
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const OR_API_KEY = process.env.OPENROUTER_API_KEY;

export const AI_PROVIDER = OR_API_KEY
  ? "openrouter"
  : AI_API_KEY
    ? "huggingface"
    : HF_API_KEY
      ? "huggingface"
      : "none";

const SYSTEM_PROMPT = `You are an impartial AI media-context navigator.
Analyze the video transcript fragment provided with its timestamp.
Evaluate it strictly through the lens of the user's goal.
Deliver an objective, intermediate opinion — no toxicity, no subjective "good/bad" verdicts.
If the author presents an alternative or non-standard viewpoint, do NOT label it as fake science or misinformation.
Correctly mark it as "alternative" and briefly compare it with the prevailing consensus in this domain
(scientific, industrial, or IT standard).
Completely ignore filler, fluff, and ad integrations unrelated to the topic.
Respond ONLY with a single valid JSON object, no markdown, no prose outside JSON.`;

const USER_PROMPT_TEMPLATE = (chunkText: string, chunkTime: string, userFocus: string) => JSON.stringify({
  chunkTime,
  userFocus,
  chunkText,
  instructions: {
    summary: "1-2 sentences capturing the essence of this fragment.",
    perspective: "Either 'consensus' for standard view or 'alternative' for non-standard view.",
    analysis: "Concise, neutral AI intermediate opinion, cross-referenced with known knowledge base.",
    score: "Integer 0-100. 0 = pure ad/filler, 100 = pure scientific/practical concentrate."
  }
}, null, 2);

function buildChunkPrompt(chunkText: string, chunkTime: string, userFocus: string): string {
  return `${SYSTEM_PROMPT}\n\n${USER_PROMPT_TEMPLATE(chunkText, chunkTime, userFocus)}`;
}

function getActiveToken(): string | undefined {
  return AI_API_KEY || HF_API_KEY || OR_API_KEY;
}

/**
 * Отправляет один чанк текста в бесплатный ИИ-провайдер.
 * Использует Hugging Face Inference API (по умолчанию Qwen2.5-72B-Instruct)
 * или OpenRouter при наличии соответствующего ключа.
 */
export async function analyzeChunkWithAI(
  chunkText: string,
  chunkTime: string,
  userFocus: string
): Promise<any> {
  const token = getActiveToken();
  if (!token) {
    throw new Error("No AI API key configured. Set AI_API_KEY (or HUGGINGFACE_API_KEY / OPENROUTER_API_KEY) in .env.local");
  }

  const prompt = buildChunkPrompt(chunkText, chunkTime, userFocus);

  if (AI_PROVIDER === "openrouter" && OR_API_KEY) {
    return callOpenRouter(prompt);
  }

  return callHuggingFace(prompt);
}

async function callOpenRouter(prompt: string): Promise<any> {
  // Пробуем несколько бесплатных моделей OpenRouter по порядку
  const models = [
    "qwen/qwen2.5-72b-instruct:free",
    "meta-llama/llama-3.1-8b-instruct:free",
    "mistralai/mistral-7b-instruct:free",
    "google/gemini-2.0-flash-lite-001",
  ];

  let lastError: Error | null = null;
  for (const model of models) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OR_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://my-youtube-filter.app",
          "X-Title": "YouTube Concept Filter",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          max_tokens: 1024,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        lastError = new Error(`OpenRouter ${model} error ${res.status}: ${err}`);
        continue;
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content ?? "";
      return parseChunkResponse(content);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error("All OpenRouter models failed");
}

async function callHuggingFace(prompt: string): Promise<any> {
  const token = AI_API_KEY || HF_API_KEY;
  const res = await fetch(
    "https://api-inference.huggingface.co/models/Qwen/Qwen2.5-72B-Instruct",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 1024, temperature: 0.2, return_full_text: false },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HuggingFace error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const content = Array.isArray(data) ? (data[0]?.generated_text ?? "") : (data.generated_text ?? "");
  return parseChunkResponse(content);
}

function parseChunkResponse(content: string): any {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in AI response");
    }
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      perspective: parsed.perspective === "alternative" ? "alternative" : "consensus",
      analysis: typeof parsed.analysis === "string" ? parsed.analysis : "",
      score: typeof parsed.score === "number" ? parsed.score : 0,
    };
  } catch (err) {
    throw new Error(
      `Failed to parse AI JSON response: ${err instanceof Error ? err.message : "unknown"}`
    );
  }
}

export function getProviderStatus(): { provider: string; configured: boolean } {
  return {
    provider: AI_PROVIDER,
    configured: AI_PROVIDER !== "none",
  };
}