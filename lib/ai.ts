const modelName = "google/gemini-2.5-flash";

const SYSTEM_PROMPT = `You are an impartial AI media-context navigator.
Analyze the video transcript fragment provided with its timestamp.
Evaluate it strictly through the lens of the user's goal.
Deliver an objective, intermediate opinion — no toxicity, no subjective "good/bad" verdicts.
If the author presents an alternative or non-standard viewpoint, do NOT label it as fake science or misinformation.
Correctly mark it as "alternative" and briefly compare it with the prevailing consensus in this domain.
Completely ignore filler, fluff, and ad integrations unrelated to the topic.
Respond ONLY with a single valid JSON object, no markdown, no prose outside JSON.`;

/**
 * Отправляет один чанк текста в OpenRouter API.
 */
export async function analyzeChunkWithAI(
  chunkText: string,
  chunkTime: string,
  userFocus: string
): Promise<any> {
  const token = process.env.AI_API_KEY;
  if (!token) {
    throw new Error("No AI API key configured. Set AI_API_KEY in .env.local");
  }

  // Укорачиваем промпт, чтобы уложиться в FREE лимит токенов
  const content = `${SYSTEM_PROMPT}\n\nTime: ${chunkTime}\nFocus: ${userFocus}\nText: ${chunkText.slice(0, 500)}`;

  let res: Response;
  try {
    res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "AI Anatomy YouTube Filter",
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: "user", content }],
        max_tokens: 256,
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    });
  } catch (err) {
    return getFallbackResponse();
  }

  // 402 = insufficient credits (FREE тариф исчерпан) — не падаем, возвращаем fallback
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    if (res.status === 402 || res.status === 429) {
      return getFallbackResponse();
    }
    throw new Error(`OpenRouter error ${res.status}: ${errText}`);
  }

  const data = await res.json().catch(() => null);
  if (!data) {
    return getFallbackResponse();
  }

  const rawContent = data.choices?.[0]?.message?.content ?? "";
  if (!rawContent) {
    return getFallbackResponse();
  }

  // Очищаем возможные markdown-теги ```json перед парсингом
  const cleaned = rawContent
    .replace(/^```(?:json)?\s*\n?/im, "")
    .replace(/\n?```\s*$/im, "")
    .trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return getFallbackResponse();
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return getFallbackResponse();
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
  const token = process.env.AI_API_KEY;
  return {
    provider: token ? "openrouter" : "none",
    configured: !!token,
  };
}