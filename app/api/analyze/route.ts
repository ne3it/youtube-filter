import { NextResponse } from "next/server";
import { analyzeChunkWithAI, getProviderStatus } from "@/lib/ai";

const STOP_WORDS = new Set([
  "и", "в", "во", "не", "что", "он", "на", "я", "с", "со", "как", "а", "то",
  "все", "она", "так", "его", "но", "да", "ты", "к", "у", "же", "вы", "за",
  "бы", "по", "только", "ее", "мне", "было", "вот", "от", "меня", "еще",
  "нет", "о", "из", "как", "до", "них", "ним", "ними", "этом", "эта", "эти",
  "этот", "это", "этих", "эту", "при", "этом", "уже", "ли", "ни", "чтобы",
  "когда", "потом", "тогда", "чтобы", "чтоб", "если", "или", "ни", "чтобы",
]);

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^a-zа-яё0-9]/g, "");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { chunks, userFocus } = body as {
      chunks: Array<{ chunkId: number; text: string; timestamp: string }>;
      userFocus: string;
    };

    if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
      return NextResponse.json({ error: "chunks are required" }, { status: 400 });
    }

    const status = getProviderStatus();
    if (!status.configured) {
      return NextResponse.json(
        { error: "No AI provider configured", provider: status.provider },
        { status: 503 }
      );
    }

    // 1. Лексический портрет — быстрая статистика слов без ИИ
    const fullText = chunks.map((c) => c.text).join(" ");
    const wordCounts = new Map<string, number>();

    for (const rawWord of fullText.split(/\s+/)) {
      const word = normalizeWord(rawWord);
      if (!word || word.length < 2 || STOP_WORDS.has(word)) continue;
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }

    const lexicalStats = Array.from(wordCounts.entries())
      .map(([text, value]) => ({ text, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);

    // 2. Обработка каждого чанка через ИИ
    const timelineData = await Promise.all(
      chunks.map(async (chunk) => {
        try {
          const aiResult = await analyzeChunkWithAI(
            chunk.text,
            chunk.timestamp,
            userFocus || "general analysis"
          );
          return {
            chunkId: chunk.chunkId,
            timestamp: chunk.timestamp,
            ...aiResult,
          };
        } catch (err) {
          return {
            chunkId: chunk.chunkId,
            timestamp: chunk.timestamp,
            summary: "",
            perspective: "consensus",
            analysis: `Error: ${err instanceof Error ? err.message : "unknown"}`,
            score: 0,
            error: true,
          };
        }
      })
    );

    return NextResponse.json({ lexicalStats, timelineData }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}