<<<<<<< HEAD
const modelName = "openrouter/free";
=======
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
>>>>>>> parent of f693f2e (feat(ai): приоритет фокуса пользователя в системном промпте)

export async function analyzeChunkWithAI(chunkText: string, chunkTime: string, userFocus: string): Promise<any> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    console.error("Критическая ошибка: В .env.local не найден AI_API_KEY");
    return getFallbackResponse(chunkTime, "В .env.local отсутствует ключ API.");
  }

  const systemPrompt = `Ты — беспристрастный ИИ-навигатор. Твоя задача — проанализировать чанк текста видео с таймкодом [${chunkTime}] через призму фокуса пользователя: '${userFocus}'.
Напиши ответ строго в формате JSON, содержащем текстовые поля на русском языке: summary (суть за 1-2 предложения), perspective ('consensus' или 'alternative'), analysis (твое промежуточное мнение), score (число от 0 до 100).
ВНИМАНИЕ: Твой ответ должен содержать ТОЛЬКО этот JSON-объект. Не пиши никаких вступлений, приветствий, объяснений или markdown-оберток вроде \`\`\`json.`;

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
