import { NextResponse } from "next/server";
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

    const apiKey = process.env.SUPADATA_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "SUPADATA_API_KEY не настроен. Добавьте ключ в .env.local" },
        { status: 500 }
      );
    }

    // Запрос к Supadata API для получения транскрипта
    const supadataUrl = `https://supadata.ai/transcript?url=${encodeURIComponent(url)}`;
    const res = await fetch(supadataUrl, {
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Supadata error ${res.status}: ${errText}` },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Supadata возвращает массив сегментов в поле data (или content)
    const segments = data.data || data.content || data.segments || [];
    if (!Array.isArray(segments) || segments.length === 0) {
      return NextResponse.json(
        { error: "Субтитры не найдены в ответе Supadata" },
        { status: 404 }
      );
    }

    // Конвертер: извлекаем { text, start, duration }
    // Supadata формат: { text, offset (ms), duration (ms) }
    const subtitles = segments
      .map((seg: any) => {
        const text = typeof seg.text === "string" ? seg.text.trim() : "";
        if (!text) return null;
        const offset = Number(seg.offset) || 0;
        const duration = Number(seg.duration) || 0;
        return {
          text,
          start: offset, // в миллисекундах
          duration,
        };
      })
      .filter((s): s is { text: string; start: number; duration: number } => s !== null);

    if (subtitles.length === 0) {
      return NextResponse.json(
        { error: "Не удалось распарсить сегменты субтитров" },
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