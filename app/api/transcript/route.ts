import { NextResponse } from "next/server";
import { extractVideoId, chunkTranscript, normalizeTranscript } from "@/lib/youtube";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
  }

  // Попытаемся использовать yt-dlp через публичный прокси, иначе — встроенный fallback.
  // В production здесь был бы вызов yt-dlp/pipe. Для минималистичного стека
  // мы полагаемся на публичный endpoint, который возвращает субтитры.
  try {
    const transcript = await fetchTranscript(videoId);
    return NextResponse.json(transcript);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function fetchTranscript(videoId: string) {
  // Попытка 1: публичный youtranscript-совместимый прокси
  const endpoints = [
    `https://youtubetranscript.com/?v=${videoId}&lang=en`,
    `https://youtubetranscript.com/?v=${videoId}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (res.ok) {
        const text = await res.text();
        const parsed = parseTranscriptResponse(text);
        if (parsed.length > 0) {
          return normalizeTranscript(parsed, videoId, { language: "en" });
        }
      }
    } catch {
      // continue
    }
  }

  throw new Error("Could not fetch transcript. Video may have captions disabled.");
}

function parseTranscriptResponse(text: string): Array<{ text?: string; start?: number; duration?: number }> {
  // youtranscript.com возвращает JSON-массив объектов {text, start, duration}
  // или XML-разметку. Пробуем JSON.
  try {
    const json = JSON.parse(text);
    if (Array.isArray(json)) {
      return json.map((item) => ({
        text: item.text,
        start: item.start ? Number(item.start) : undefined,
        duration: item.duration ? Number(item.duration) : undefined,
      }));
    }
  } catch {
    // не JSON — пробуем XML-разметку <transcript><text start="..." dur="...">...</text></transcript>
  }

  const xmlMatches = text.matchAll(/<text\s+start="([\d.]+)"\s+dur="([\d.]+)"[^>]*>([^<]*)<\/text>/g);
  const result: Array<{ text?: string; start?: number; duration?: number }> = [];
  for (const m of xmlMatches) {
    result.push({
      start: Number(m[1]) * 1000,
      duration: Number(m[2]) * 1000,
      text: decodeHtml(m[3]),
    });
  }
  return result;
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

export async function POST(req: Request) {
  // Позволяет передавать произвольный текст субтитров для тестирования
  try {
    const body = await req.json();
    const { segments, videoId, title, channel, language } = body;

    if (!videoId || !Array.isArray(segments)) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const transcript = normalizeTranscript(segments, videoId, { title, channel, language });
    return NextResponse.json(transcript);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}