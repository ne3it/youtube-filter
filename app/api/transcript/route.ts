import { NextResponse } from "next/server";
import { extractVideoId, splitIntoChunks, fetchTranscript } from "@/lib/youtube";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: "URL не указан" }, { status: 400 });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json({ error: "Неверный формат ссылки" }, { status: 400 });
    }

    let subtitles: Array<{ text: string; start: number; duration: number }>;
    try {
      subtitles = await fetchTranscript(videoId, "ru");
    } catch {
      try {
        subtitles = await fetchTranscript(videoId, "en");
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown";
        return NextResponse.json(
          { error: `Субтитры недоступны для этого видео: ${message}` },
          { status: 404 }
        );
      }
    }

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