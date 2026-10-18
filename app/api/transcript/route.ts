import { NextResponse } from "next/server";
import { extractVideoId, splitIntoChunks } from "@/lib/youtube";

/**
 * Парсит строку субтитров формата "MM:SS текст" или "H:MM:SS текст".
 * Возвращает { text, start } где start — в секундах.
 */
function parseSubtitleLine(line: string): { text: string; start: number } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Ищем таймкод в начале строки: "0:13", "1:23:45", "00:13", "12:34"
  const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s+(.*)$/);
  if (!timeMatch) {
    // Если таймкода нет — присваиваем start=0
    return { text: trimmed, start: 0 };
  }

  const hours = timeMatch[3] ? parseInt(timeMatch[1], 10) : 0;
  const minutes = timeMatch[3] ? parseInt(timeMatch[2], 10) : parseInt(timeMatch[1], 10);
  const seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : parseInt(timeMatch[2], 10);

  const start = hours * 3600 + minutes * 60 + seconds;
  const text = timeMatch[timeMatch[3] ? 4 : 3]?.trim() || "";

  if (!text) return null;
  return { text, start };
}

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

    const apiKey = process.env.YOUTUBE_AI_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "YOUTUBE_AI_KEY не настроен. Добавьте ключ в .env.local" },
        { status: 500 }
      );
    }

    // Запрос к YouTube-Transcript.ai API
    const transcriptUrl = `https://youtube-transcript.ai/transcript/${videoId}.txt`;
    const res = await fetch(transcriptUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "text/plain",
      },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `YouTube-Transcript.ai error ${res.status}: ${errText}` },
        { status: res.status }
      );
    }

    const rawText = await res.text();
    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json(
        { error: "Субтитры не найдены для этого видео" },
        { status: 404 }
      );
    }

    // Парсим текст: разбиваем по строкам, извлекаем таймкод и текст
    const lines = rawText.split(/\r?\n/);
    const subtitles: Array<{ text: string; start: number; duration: number }> = [];

    for (const line of lines) {
      const parsed = parseSubtitleLine(line);
      if (!parsed) continue;

      // parsed.start — в секундах, преобразуем в миллисекунды для совместимости с splitIntoChunks
      const startMs = parsed.start * 1000;
      // Длительность: 3 секунды по умолчанию
      const duration = 3000;

      subtitles.push({
        text: parsed.text,
        start: startMs,
        duration,
      });
    }

    if (subtitles.length === 0) {
      return NextResponse.json(
        { error: "Не удалось распарсить субтитры" },
        { status: 404 }
      );
    }

    // Разбиваем на 5-минутные чанки
    const chunks = splitIntoChunks(subtitles, 300);

    return NextResponse.json({ videoId, chunks }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}