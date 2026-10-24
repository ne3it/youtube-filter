const modelName = "openrouter/free";

export async function analyzeChunkWithAI(chunkText: string, chunkTime: string, userFocus: string): Promise<any> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    console.error("Критическая ошибка: В .env.local не найден AI_API_KEY");
    return getFallbackResponse(chunkTime, "В .env.local отсутствует ключ API.");
  }

  const systemPrompt = `Ты — беспристрастный ИИ-навигатор. Твоя задача — проанализировать чанк текста видео с таймкодом [${chunkTime}] через призму фокуса пользователя: '${userFocus}'.
Напиши ответ строго в формате JSON, содержащем текстовые поля на русском языке: summary (суть за 1-2 предложения), perspective ('consensus' или 'alternative'), analysis (твое промежуточное мнение), score (число от 0 до 100).
ВНИМАНИЕ: Твой ответ должен содержать ТОЛЬКО этот JSON-объект. Не пиши никаких вступлений, приветствий, объяснений или markdown-оберток вроде \`\`\`json.
Если текст субтитров пришел на английском языке, твоя задача — самостоятельно перевести его смысл и всё равно написать поля summary и analysis на качественном русском языке.`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "AI Anatomy YouTube Filter",
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: "user",
            content: `${systemPrompt}\n\nТекст субтитров для анализа:\n${chunkText}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 256,
      }),
    });

    if (!response.ok) {
      const errData = await response.text();
      console.error("OpenRouter Error status:", response.status, errData);
      return getFallbackResponse(chunkTime, `Код ошибки OpenRouter: ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || "";

    let cleanJsonString = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

    const firstBrace = cleanJsonString.indexOf("{");
    const lastBrace = cleanJsonString.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanJsonString = cleanJsonString.slice(firstBrace, lastBrace + 1);
    }

    const jsonMatch = cleanJsonString.match(/\{[\s\S]*\}/);
    const parseTarget = jsonMatch ? jsonMatch[0] : cleanJsonString;

    return JSON.parse(parseTarget);
  } catch (error: any) {
    console.error("Ошибка парсинга OpenRouter:", error);
    return getFallbackResponse(chunkTime, error.message || "Не удалось распарсить JSON.");
  }
}

function getFallbackResponse(time: string, reason: string) {
  return {
    summary: "AI-анализ временно недоступен.",
    perspective: "consensus",
    analysis: `Используется резервная заглушка. Причина: ${reason}`,
    score: 0
  };
}

export function getProviderStatus(): { provider: string; configured: boolean } {
  const token = process.env.AI_API_KEY;
  return {
    provider: token ? "openrouter" : "none",
    configured: !!token,
  };
}
