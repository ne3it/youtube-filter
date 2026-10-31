const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function analyzeVideoChunk(chunkText: string, chunkTime: string, userFocus: string) {
  const apiKey =
    process.env.NEXT_PUBLIC_OPENROUTER_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    process.env.AI_API_KEY;

  const systemPrompt = `Ты — беспристрастный ИИ-навигатор. Твоя задача — проанализировать чанк текста видео с таймкодом [${chunkTime}] через призму фокуса пользователя: '${userFocus}'.
Напиши ответ строго в формате JSON, содержащем текстовые поля на русском языке: summary (суть за 1-2 предложения), perspective ('consensus' или 'alternative'), analysis (твое промежуточное мнение), score (число от 0 до 100).
ВНИМАНИЕ: Твой ответ должен содержать ТОЛЬКО этот JSON-объект. Не пиши никаких вступлений, приветствий, объяснений или markdown-оберток вроде \`\`\`json.`;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com",
        "X-Title": "YT.ANATOMY",
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: chunkText },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter HTTP error: ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || "";

    const firstBrace = rawText.indexOf("{");
    const lastBrace = rawText.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1 || firstBrace > lastBrace) {
      throw new Error("Валидный JSON-объект отсутствует в ответе модели");
    }

    const cleanedJsonString = rawText.substring(firstBrace, lastBrace + 1);
    const parsedResult = JSON.parse(cleanedJsonString);

    return {
      success: true,
      data: {
        summary: parsedResult.summary || "",
        perspective: parsedResult.perspective || "consensus",
        analysis: parsedResult.analysis || "",
        score: Number(parsedResult.score) || 0,
      },
    };
  } catch (error) {
    console.error("Ошибка в пайплайне всеядного ИИ:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      fallback: {
        score: 0,
        summary: "AI-анализ временно недоступен.",
        perspective: "consensus",
        analysis: String(error),
      },
    };
  }
}

// Для обратной совместимости со старым кодом
export const analyzeChunkWithAI = async (
  chunkText: string,
  chunkTime: string,
  userFocus: string
) => {
  const result = await analyzeVideoChunk(chunkText, chunkTime, userFocus);
  if (result.success) {
    return result.data;
  }
  return result.fallback;
};

export const getProviderStatus = () => {
  const apiKey =
    process.env.NEXT_PUBLIC_OPENROUTER_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    process.env.AI_API_KEY;
  return {
    configured: !!apiKey,
    provider: "openrouter",
    model: "openrouter/free",
  };
};

export default analyzeVideoChunk;
