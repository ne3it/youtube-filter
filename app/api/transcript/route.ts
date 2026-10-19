import { NextResponse } from "next/server";
import { splitIntoChunks } from "@/lib/youtube";

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: "URL не указан" }, { status: 400 });
    }

    const apiKey = process.env.SUPADATA_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Ключ Supadata не найден в .env" }, { status: 500 });
    }

    // Делаем официальный запрос к Supadata, который стабильно обходит блокировки в 2026 году
    const response = await fetch(`https://supadata.ai/v1/transcript?url=${encodeURIComponent(url)}`, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Supadata Error:", errText);
      return NextResponse.json({ error: "Не удалось получить субтитры от Supadata" }, { status: response.status });
    }

    const result = await response.json();
    // Извлекаем сегменты (в Supadata они лежат в массиве content или data)
    const segments = result.content || result.data || [];

    if (!segments.length) {
      return NextResponse.json({ error: "Субтитры пусты или недоступны" }, { status: 404 });
    }

    // Мапим данные из миллисекунд в секунды
    const formattedSubtitles = segments.map((seg: any) => ({
      text: seg.text,
      start: seg.offset / 1000, // Переводим миллисекунды в секунды
      duration: (seg.duration || 0) / 1000
    }));

    const chunks = splitIntoChunks(formattedSubtitles);

    return NextResponse.json({ chunks });

  } catch (error: any) {
    console.error("Критическая ошибка роутера транскрипта:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
