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

    let raw: Awaited<ReturnType<typeof YoutubeTranscript.fetchTranscript>>;
    try {
      raw = await YoutubeTranscript.fetchTranscript(videoId, { lang: "ru" });
    } catch {
      try {
        raw = await YoutubeTranscript.fetchTranscript(videoId, { lang: "en" });
      } catch {
        return NextResponse.json(
          { error: "Субтитры недоступны для этого видео" },
          { status: 404 }
        );
      }
    }

    if (!Array.isArray(raw) || raw.length === 0) {
      return NextResponse.json(
        { error: "Субтитры недоступны для этого видео" },
        { status: 404 }
      );
    }

    // youtube-transcript: TranscriptResponse { text, duration, offset, lang? }
    const subtitles = raw.map((s) => ({
      text: s.text,
      start: Number((s as any).offset ?? (s as any).start ?? 0) || 0,
      duration: Number((s as any).duration ?? 0) || 0,
    }));

    const chunks = splitIntoChunks(subtitles, 300);

    return NextResponse.json({ videoId, chunks }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}