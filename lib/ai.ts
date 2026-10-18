const AI_API_KEY = process.env.AI_API_KEY;
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

export const AI_PROVIDER = AI_API_KEY || HF_API_KEY ? "huggingface" : "none";

const SYSTEM_PROMPT = `You are an impartial AI media-context navigator.
Analyze the video transcript fragment provided with its timestamp.
Evaluate it strictly through the lens of the user's goal.
Deliver an objective, intermediate opinion — no toxicity, no subjective "good/bad" verdicts.
If the author presents an alternative or non-standard viewpoint, do NOT label it as fake science or misinformation.
Correctly mark it as "alternative" and briefly compare it with the prevailing consensus in this domain
(scientific, industrial, or IT standard).
Completely ignore filler, fluff, and ad integrations unrelated to the topic.
You MUST respond with a single valid JSON object and nothing else.
Do NOT wrap the JSON in markdown code fences.
Do NOT add any prose outside the JSON object.
Start your response with '{' and end with '}'.`;

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
  return `${SYSTEM_PROMPT}\n\n${USER_PROMPT_TEMPLATE(chunkText, chunkTime, userFocus)}\n\nREMINDER: Respond ONLY with a single valid JSON object. Start with '{' and end with '}'. No markdown, no prose.`;
}

function getActiveToken(): string | undefined {
  return AI_API_KEY || HF_API_KEY;
}

/**
 * Отправляет один чанк текста в Hugging Face Serverless Inference API.
 * Использует модель Qwen/Qwen2.5-72B-Instruct — мощная бесплатная модель с поддержкой инструкций.
 */
export async function analyzeChunkWithAI(
  chunkText: string,
  chunkTime: string,
  userFocus: string
): Promise<any> {
  const token = getActiveToken();
  if (!token) {
    throw new Error("No AI API key configured. Set AI_API_KEY (or HUGGINGFACE_API_KEY) in .env.local");
  }

  const prompt = buildChunkPrompt(chunkText, chunkTime, userFocus);
  return callHuggingFace(prompt, token);
}

async function callHuggingFace(prompt: string, token: string): Promise<any> {
  // Hugging Face Serverless Inference API — несколько стабильных моделей
  const models = [
    "Qwen/Qwen2.5-72B-Instruct",
    "meta-llama/Meta-Llama-3-8B-Instruct",
    "mistralai/Mistral-7B-Instruct-v0.3",
  ];

  let lastError: Error | null = null;
  for (const model of models) {
    try {
      const res = await fetch(
        `https://api-inference.huggingface.co/models/${model}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              max_new_tokens: 1024,
              temperature: 0.2,
              return_full_text: false,
            },
          }),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        lastError = new Error(`HuggingFace ${model} error ${res.status}: ${err}`);
        continue;
      }

      const data = await res.json();
      const content = Array.isArray(data)
        ? (data[0]?.generated_text ?? "")
        : (data.generated_text ?? "");
      return parseChunkResponse(content);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error("All HuggingFace models failed");
}

/**
 * Гибкий парсинг ответа ИИ.
 * Очищает текст от markdown-оградок, лишних пробелов и извлекает JSON.
 */
export function parseChunkResponse(content: string): any {
  if (!content || typeof content !== "string") {
    throw new Error("Empty AI response");
  }

  // Убираем markdown-код-фенки (```json ... ``` или ``` ... ```)
  let cleaned = content
    .replace(/^```(?:json)?\s*\n?/im, "")
    .replace(/\n?```\s*$/im, "")
    .trim();

  // Извлекаем первый JSON-объект (на случай, если модель добавила текст до/после)
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON object found in AI response");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (err) {
    throw new Error(
      `Failed to parse AI JSON response: ${err instanceof Error ? err.message : "unknown"}`
    );
  }

  return {
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    perspective: parsed.perspective === "alternative" ? "alternative" : "consensus",
    analysis: typeof parsed.analysis === "string" ? parsed.analysis : "",
    score: typeof parsed.score === "number" ? parsed.score : 0,
  };
}

export function getProviderStatus(): { provider: string; configured: boolean } {
  return {
    provider: AI_PROVIDER,
    configured: AI_PROVIDER !== "none",
  };
}