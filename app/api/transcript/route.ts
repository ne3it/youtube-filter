import { splitIntoChunks } from "@/lib/youtube";
import { NextResponse } from "next/server";
import { extractVideoId } from "@/lib/youtube";

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

    // Нормализуем ссылку: короткие youtu.be -> длинный youtube.com
    const videoId = extractVideoId(url);
    const normalizedUrl = videoId
      ? `https://www.youtube.com/watch?v=${videoId}`
      : url;

    // Делаем официальный запрос к Supadata
    const response = await fetch(`https://api.supadata.ai/v1/transcript?url=${encodeURIComponent(normalizedUrl)}&lang=ru`, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok && response.status !== 202) {
      const errorDetail = await response.text();
      console.error("ПОДРОБНАЯ ОШИБКА SUPADATA:", errorDetail);
      return NextResponse.json({ error: `Supadata Error: ${response.status} - ${errorDetail}` }, { status: response.status });
    }

    let segments: any[] = [];

    if (response.status === 200) {
      const result = await response.json();
      segments = result.content || result.data || [];
    } else if (response.status === 202) {
      const { jobId } = await response.json();

      let attempts = 0;
      const maxAttempts = 20;
      while (attempts < maxAttempts) {
        await new Promise((res) => setTimeout(res, 2000));
        attempts++;

        const statusRes = await fetch(`https://api.supadata.ai/v1/transcript/${jobId}`, {
          method: "GET",
          headers: {
            "x-api-key": apiKey,
            "Content-Type": "application/json"
          }
        });

        if (statusRes.status === 200) {
          const result = await statusRes.json();
          segments = result.content || result.data || [];
          if (segments.length) break;
        }

        const statusData = await statusRes.json().catch(() => ({}));
        if (statusData.status === "completed") {
          segments = statusData.content || statusData.data || [];
          break;
        }
      }
    }

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
