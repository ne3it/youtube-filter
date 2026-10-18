import type { AnalysisRequest, AnalysisResult, Chunk } from "@/types";

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const OR_API_KEY = process.env.OPENROUTER_API_KEY;

export const AI_PROVIDER = OR_API_KEY ? "openrouter" : HF_API_KEY ? "huggingface" : "none";

const SYSTEM_PROMPT = `You are an AI-powered anatomical concept filter for YouTube videos.
Your task: extract the conceptual "skeleton" of a video transcript.
Be precise, neutral, and evidence-grounded. Never invent claims not supported by the text.
Respond ONLY with a single JSON object, no markdown, no prose outside JSON.`;

const USER_PROMPT_TEMPLATE = (req: AnalysisRequest) => JSON.stringify({
  videoId: req.videoId,
  title: req.title,
  userFocus: req.userFocus,
  chunks: req.chunks.map((c: Chunk) => ({ index: c.index, text: c.text })),
  instructions: {
    summary: "1-2 sentences capturing the video's central claim.",
    coreConcept: "The single most dominant concept or thesis.",
    conceptScores: "Array of {concept, score(0-100), weight(0-1), evidence(quote), timestamp(ms)}. 5-8 items.",
    semanticTimeline: "Array of {t(ms), density(0-1), label}. 6-10 points across the video.",
    wordCloud: "Array of {word, weight(0-1), sentiment}. 12-18 items.",
    theses: "Array of {id, claim, support(quote), confidence(0-1), timestamp(ms)}. 3-5 alternative theses."
  }
}, null, 2);

export function buildAnalysisPrompt(req: AnalysisRequest): string {
  return `${SYSTEM_PROMPT}\n\n${USER_PROMPT_TEMPLATE(req)}`;
}

export function getProviderStatus(): { provider: string; configured: boolean } {
  return {
    provider: AI_PROVIDER,
    configured: AI_PROVIDER !== "none",
  };
}

/**
 * Отправляет запрос к выбранному провайдеру и возвращает AnalysisResult.
 * Использует OpenRouter при наличии ключа, иначе Hugging Face.
 */
export async function analyzeWithAI(req: AnalysisRequest): Promise<AnalysisResult> {
  const prompt = buildAnalysisPrompt(req);

  if (AI_PROVIDER === "openrouter" && OR_API_KEY) {
    return callOpenRouter(prompt, req);
  }

  if (AI_PROVIDER === "huggingface" && HF_API_KEY) {
    return callHuggingFace(prompt, req);
  }

  throw new Error("No AI provider configured. Set HUGGINGFACE_API_KEY or OPENROUTER_API_KEY in .env.local");
}

async function callOpenRouter(prompt: string, req: AnalysisRequest): Promise<AnalysisResult> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OR_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://my-youtube-filter.app",
      "X-Title": "YouTube Concept Filter",
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-001",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  return parseAIResponse(content, req);
}

async function callHuggingFace(prompt: string, req: AnalysisRequest): Promise<AnalysisResult> {
  const res = await fetch("https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HF_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: { max_new_tokens: 4096, temperature: 0.2, return_full_text: false },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HuggingFace error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const content = Array.isArray(data) ? (data[0]?.generated_text ?? "") : (data.generated_text ?? "");
  return parseAIResponse(content, req);
}

function parseAIResponse(content: string, req: AnalysisRequest): AnalysisResult {
  // Extract JSON from possible markdown code fences
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("AI response did not contain valid JSON");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error("Failed to parse AI JSON response");
  }

  return {
    videoId: req.videoId,
    title: req.title,
    channel: (parsed.channel as string) ?? "Unknown channel",
    summary: (parsed.summary as string) ?? "",
    coreConcept: (parsed.coreConcept as string) ?? "",
    conceptScores: Array.isArray(parsed.conceptScores) ? parsed.conceptScores : [],
    semanticTimeline: Array.isArray(parsed.semanticTimeline) ? parsed.semanticTimeline : [],
    wordCloud: Array.isArray(parsed.wordCloud) ? parsed.wordCloud : [],
    theses: Array.isArray(parsed.theses) ? parsed.theses : [],
    generatedAt: Date.now(),
  };
}