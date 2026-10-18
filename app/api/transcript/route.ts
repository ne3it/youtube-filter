import { NextResponse } from "next/server";
import { extractVideoId, splitIntoChunks, fetchTranscript } from "@/lib/youtube";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, manualText } = body;

    // Режим ручного ввода текста субтитров
    if (manualText) {
      if (typeof manualText !== "string" || manualText.trim().length < 10) {
        return NextResponse.json(
          { error: "Текст субтитров слишком короткий" },
          { status: 400 }
        );
      }
      // Преобразуем текст в массив субтитров без таймкодов
      const subtitles = manualText
        .split(/\n+/)
        .map((line: string, i: number) => ({
          text: line.trim(),
          start: i * 3000,
          duration: 3000,
        }))
        .filter((s: { text: string }) => s.text.length > 0);

      const chunks = splitIntoChunks(subtitles, 300);
      return NextResponse.json({ videoId: "manual", chunks }, { status: 200 });
    }

    if (!url) {
      return NextResponse.json({ error: "URL не указан" }, { status: 400 });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json({ error: "Неверный формат ссылки" }, { status: 400 });
    }

    let result: Array<{ text: string; start: number; duration: number }> | { requiresManualInput: true };
    try {
      result = await fetchTranscript(videoId, "ru");
    } catch (err) {
      console.warn("[transcript] ru failed:", err instanceof Error ? err.message : err);
      try {
        result = await fetchTranscript(videoId, "en");
      } catch (err2) {
        const message = err2 instanceof Error ? err2.message : "unknown";
        return NextResponse.json(
          { error: `Субтитры недоступны для этого видео: ${message}` },
          { status: 404 }
        );
      }
    }

    if (result && typeof result === "object" && "requiresManualInput" in result) {
      return NextResponse.json(
        { requiresManualInput: true },
        { status: 200 }
      );
    }

    const subtitles = result as Array<{ text: string; start: number; duration: number }>;
    if (!Array.isArray(subtitles) || subtitles.length === 0) {
      return NextResponse.json(
        { error: "Субтитры недоступны для этого видео" },
        { status: 404 }
      );
    }

    const chunks = splitIntoChunks(subtitles, 300);

    return NextResponse.json({ videoId, chunks }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}