import { NextResponse } from "next/server";
import { analyzeChunkWithAI, getProviderStatus } from "@/lib/ai";

const STOP_WORDS = new Set([
  "и", "в", "во", "не", "что", "он", "на", "я", "с", "со", "как", "а", "то",
  "все", "всё", "всей", "всех", "она", "так", "его", "но", "да", "ты", "к", "у", "же", "вы", "за",
  "бы", "по", "только", "ее", "мне", "было", "быть", "есть", "уже", "еще", "ещё", "вот", "от", "меня", "нет", "о", "из", "до", "них", "ним", "ними", "этом", "эта", "эти",
  "этот", "это", "этих", "эту", "при", "ли", "ни", "чтобы",
  "чтоб", "если", "или", "когда", "потом", "тогда", "того", "значит", "сказать", "слова", "будет", "после", "хочу", "очень", "просто", "надо", "там", "они", "мы", "вы", "она", "оно", "его", "ее", "их", "тебе", "нам", "вам", "тебя",
  "ну", "так", "вот", "уже", "ещё", "только", "просто", "очень", "надо", "значит", "сказать", "будет", "после", "если", "хочу", "can", "the",
  "and", "to", "is", "of", "in", "that", "it", "this", "you", "well", "are", "very", "he", "all", "be", "on", "for", "with", "as",
]);

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^a-zа-яё0-9]/g, "");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { chunk, userFocus } = body as {
      chunk?: { chunkId: number; text: string; timestamp: string };
      userFocus?: string;
    };

    if (!chunk || !chunk.text) {
      return NextResponse.json({ error: "chunk is required" }, { status: 400 });
    }

    const status = getProviderStatus();
    if (!status.configured) {
      return NextResponse.json(
        { error: "No AI provider configured", provider: status.provider },
        { status: 503 }
      );
    }

    const aiResult = await analyzeChunkWithAI(
      chunk.text,
      chunk.timestamp,
      userFocus || "general analysis"
    );

    return NextResponse.json({
      chunkId: chunk.chunkId,
      timestamp: chunk.timestamp,
      ...aiResult,
    }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
