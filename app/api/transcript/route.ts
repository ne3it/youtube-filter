import { NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";
import { extractVideoId, splitIntoChunks } from "@/lib/youtube";

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

    let rawSubtitles: Array<{ text: string; start: number; duration: number }>;
    try {
      rawSubtitles = await YoutubeTranscript.fetchTranscript(videoId, { lang: "ru" });
    } catch {
      // Пробуем английский язык, если русский недоступен
      try {
        rawSubtitles = await YoutubeTranscript.fetchTranscript(videoId, { lang: "en" });
      } catch {
        return NextResponse.json(
          { error: "Субтитры недоступны для этого видео" },
          { status: 404 }
        );
      }
    }

    if (!Array.isArray(rawSubtitles) || rawSubtitles.length === 0) {
      return NextResponse.json(
        { error: "Субтитры недоступны для этого видео" },
        { status: 404 }
      );
    }

    const chunks = splitIntoChunks(rawSubtitles, 300);

    return NextResponse.json({ videoId, chunks }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}