export async function analyzeChunkWithAI(chunkText: string, chunkTime: string, userFocus: string): Promise<any> {
  const modelName = "google/gemini-2.5-flash:free"; 
  const apiKey = process.env.AI_API_KEY;

  if (!apiKey) {
    console.error("Критическая ошибка: В .env.local не найден AI_API_KEY");
    return getFallbackResponse(chunkTime, "В .env.local отсутствует ключ API.");
  }

  const systemPrompt = `Ты — беспристрастный ИИ-навигатор медиа-контекста. Твоя задача — деконструировать текст видео без токсичности, высокомерия и субъективных оценок.
Анализируй фрагмент текста видео с таймкодом [${chunkTime}] строго через призму фокуса пользователя: "${userFocus}".

ВАЖНОЕ ТРЕБОВАНИЕ: Ты обязан отвечать строго на РУССКОМ ЯЗЫКЕ. Все текстовые поля возвращаемого JSON должны быть написаны на качественном русском языке.

Инструкция:
1. Сформулируй краткую суть фрагмента в поле "summary" на русском языке (1-2 предложения).
2. Определи позицию автора в поле "perspective" (строго строка "consensus" — если это стандарт, или "alternative" — если это личные гипотезы, опыт или нестандартный взгляд).
3. В поле "analysis" напиши емкое промежуточное мнение на русском языке, сопоставив тезисы автора с общепринятой базой знаний.
4. В поле "score" поставь число от 0 до 100.

ОТВЕТЬ СТРОГО В ФОРМАТЕ JSON OBJECT. Не пиши никаких вступлений, пояснений или markdown-тегов. Только чистый JSON.
Пример структуры ответа:
{
  "summary": "Автор излагает ключевые аспекты темы...",
  "perspective": "consensus",
  "analysis": "Данный фрагмент полностью соответствует общепринятым стандартам...",
  "score": 85
}

Если текст субтитров пришел на английском языке, твоя задача — самостоятельно перевести его смысл и всё равно написать поля summary и analysis на качественном русском языке.`;

  try {
    const response = await fetch("https://openrouter.ai", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "AI Anatomy YouTube Filter"
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "user", content: `${systemPrompt}\n\nТекст субтитров для анализа:\n${chunkText}` }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errData = await response.text();
      console.error("OpenRouter Error status:", response.status, errData);
      return getFallbackResponse(chunkTime, `Код ошибки OpenRouter: ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content;

    if (!rawText) {
      return getFallbackResponse(chunkTime, "ИИ вернул пустой ответ.");
    }

    const cleanJsonString = rawText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(cleanJsonString);

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
