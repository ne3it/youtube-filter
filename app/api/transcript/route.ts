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

    // Пробуем Supadata API (если ключ есть и квота не исчерпана)
    if (apiKey) {
      try {
        const supadataUrl = `https://api.supadata.ai/transcript?url=${encodeURIComponent(url)}`;
        const res = await fetch(supadataUrl, {
          headers: {
            "x-api-key": apiKey,
            "Content-Type": "application/json",
          },
        });

        if (res.ok) {
          const data = await res.json();
          const segments = data.data || data.content || data.segments || [];
          if (Array.isArray(segments) && segments.length > 0) {
            const subtitles = segments
              .map((seg: any) => {
                const text = typeof seg.text === "string" ? seg.text.trim() : "";
                if (!text) return null;
                const offset = Number(seg.offset) || 0;
                const duration = Number(seg.duration) || 0;
                return { text, start: offset, duration };
              })
              .filter((s): s is { text: string; start: number; duration: number } => s !== null);

            if (subtitles.length > 0) {
              const chunks = splitIntoChunks(subtitles, 300);
              return NextResponse.json({ videoId, chunks }, { status: 200 });
            }
          }
        }

        // 429/404 — квота исчерпана или видео недоступно, пробуем фронтенд-фолбэк
        if (res.status === 429 || res.status === 404) {
          console.warn(`[transcript] Supadata ${res.status}, falling back to frontend CORS proxy`);
        } else {
          const errText = await res.text().catch(() => "");
          console.error(`[transcript] Supadata error ${res.status}:`, errText);
        }
      } catch (err) {
        console.warn("[transcript] Supadata request failed, falling back:", err);
      }
    }

    // Фолбэк: возвращаем фронтенд-логику через CORS-прокси
    return NextResponse.json(
      { requiresFrontendFallback: true, videoId },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}