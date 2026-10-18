const AI_API_KEY = process.env.AI_API_KEY;

export const AI_PROVIDER = AI_API_KEY ? "openrouter" : "none";

const MODEL_NAME = "google/gemini-2.5-flash";

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

/**
 * Отправляет один чанк текста в OpenRouter API.
 * Использует модель google/gemini-2.5-flash (бесплатная, стабильная).
 */
export async function analyzeChunkWithAI(
  chunkText: string,
  chunkTime: string,
  userFocus: string
): Promise<any> {
  const token = AI_API_KEY;
  if (!token) {
    throw new Error("No AI API key configured. Set AI_API_KEY in .env.local");
  }

  const prompt = buildChunkPrompt(chunkText, chunkTime, userFocus);

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "AI Anatomy YouTube Filter",
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 1024,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenRouter ${MODEL_NAME} error ${res.status}: ${err}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? "";
    return parseChunkResponse(content);
  } catch (err) {
    console.error("OpenRouter request failed, using fallback:", err);
    return getFallbackResponse();
  }
}

/**
 * Гибкий парсинг ответа ИИ.
 * Очищает текст от markdown-оградок и извлекает JSON.
 */
function parseChunkResponse(content: string): any {
  if (!content || typeof content !== "string") {
    throw new Error("Empty AI response");
  }

  // Убираем markdown-код-фенки (```json ... ``` или ``` ... ```)
  let cleaned = content
    .replace(/^```(?:json)?\s*\n?/im, "")
    .replace(/\n?```\s*$/im, "")
    .trim();

  // Извлекаем первый JSON-объект
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

/**
 * Заглушка — возвращается, если запрос к ИИ упал.
 * Приложение не крашится, а показывает нейтральный consensus с score=0.
 */
export function getFallbackResponse(): any {
  return {
    summary: "AI analysis unavailable. Using fallback response.",
    perspective: "consensus",
    analysis: "Unable to reach AI service. Please check your API key and network connection.",
    score: 0,
  };
}

export function getProviderStatus(): { provider: string; configured: boolean } {
  return {
    provider: AI_PROVIDER,
    configured: AI_PROVIDER !== "none",
  };
}