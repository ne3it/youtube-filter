import { NextResponse } from "next/server";
import { analyzeChunkWithAI, getProviderStatus } from "@/lib/ai";

const STOP_WORDS = new Set([
  "и", "в", "во", "не", "что", "он", "на", "я", "с", "со", "как", "а", "то",
  "все", "всё", "всей", "всех", "она", "так", "его", "но", "да", "ты", "к", "у", "же", "вы", "за",
  "бы", "по", "только", "ее", "мне", "было", "быть", "есть", "уже", "еще", "ещё", "вот", "от", "меня", "нет", "о", "из", "до", "них", "ним", "ними", "этом", "эта", "эти",
  "этот", "это", "этих", "эту", "при", "ли", "ни", "чтобы",
  "чтоб", "если", "или", "когда", "потом", "тогда", "того", "значит", "сказать", "слова", "будет", "после", "хочу", "очень", "просто", "надо", "там", "они", "мы", "вы", "она", "оно", "его", "ее", "их", "тебе", "нам", "вам", "тебя",
  "ну", "так", "вот", "уже", "ещё", "только", "просто", "очень", "надо", "значит", "сказать", "будет", "после", "если", "хочу", "can", "the",
  "ну", "да", "это", "как", "так", "там", "вот", "они", "мы", "вы", "он", "она", "оно", "его", "ее", "их", "мне", "тебе", "нам", "вам", "меня", "тебя", "все", "всё", "всей", "всех", "было", "быть", "есть", "уже", "еще", "ещё", "когда", "только", "просто", "очень", "надо", "того", "значит", "сказать", "слова", "будет", "после", "если", "хочу", "can", "the",
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

    const timelineData: any[] = [];
    for (const chunk of chunks) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      try {
        const aiResult = await analyzeChunkWithAI(
          chunk.text,
          chunk.timestamp,
          userFocus || "general analysis"
        );
        timelineData.push({
          chunkId: chunk.chunkId,
          timestamp: chunk.timestamp,
          ...aiResult,
        });
      } catch (err) {
        timelineData.push({
          chunkId: chunk.chunkId,
          timestamp: chunk.timestamp,
          summary: "",
          perspective: "consensus",
          analysis: `Error: ${err instanceof Error ? err.message : "unknown"}`,
          score: 0,
          error: true,
        });
      }
    }

    return NextResponse.json({ lexicalStats, timelineData }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
