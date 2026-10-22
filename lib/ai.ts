import { OpenRouter } from "@openrouter/sdk";

const openrouter = new OpenRouter({ apiKey: process.env.AI_API_KEY });

const SYSTEM_PROMPT = `Ты — беспристрастный ИИ-навигатор медиа-контекста. Твоя задача — деконструировать текст видео без токсичности, высокомерия и субъективных оценок.
Анализируй фрагмент текста видео с таймкодом строго через призму фокуса пользователя.

ВАЖНОЕ ТРЕБОВАНИЕ: Ты обязан отвечать строго на РУССКОМ ЯЗЫКЕ. Все текстовые поля возвращаемого JSON должны быть написаны на качественном русском языке.

Инструкция:
1. Сформулируй краткую суть фрагмента в поле "summary" на русском языке (1-2 предложения).
2. Определи позицию автора в поле "perspective" (строго строка "consensus" — если это стандарт, или "alternative" — если это личные гипотезы, опыт или нестандартный взгляд).
3. В поле "analysis" напиши емкое промежуточное мнение на русском языке, сопоставив тезисы автора с общепринятой базой знаний.
4. В поле "score" поставь число от 0 до 100.

ОТВЕТЬ СТРОГО В ФОРМАТЕ JSON OBJECT. ЗАПРЕЩЕНО писать вступления, размышления, приветствия или выводить пояснительный текст. Твой ответ должен начинаться с символа '{' и заканчиваться символом '}'. Все поля заполняй на русском языке.

Если текст субтитров пришел на английском языке, твоя задача — самостоятельно перевести его смысл и всё равно написать поля summary и analysis на качественном русском языке.`;

export async function analyzeChunkWithAI(chunkText: string, chunkTime: string, userFocus: string): Promise<any> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    console.error("Критическая ошибка: В .env.local не найден AI_API_KEY");
    return getFallbackResponse(chunkTime, "В .env.local отсутствует ключ API.");
  }

  try {
    let responseText = "";
    const stream = await openrouter.chat.send({
      chatRequest: {
        model: "openrouter/free",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Time: ${chunkTime}\nFocus: ${userFocus}\nText: ${chunkText}` },
        ],
        stream: true,
      },
    });

    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) responseText += content;
    }

    const cleanJsonString = responseText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const jsonMatch = cleanJsonString.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return getFallbackResponse(chunkTime, "ИИ вернул не-JSON ответ.");
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error: any) {
    console.error("Ошибка OpenRouter SDK:", error);
    return getFallbackResponse(chunkTime, error.message || "Не удалось получить ответ.");
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
