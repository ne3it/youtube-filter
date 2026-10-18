import type { TranscriptResult, Chunk } from "@/types";

/**
 * Извлекает videoId из различных форматов ссылок YouTube.
 * Поддерживает:
 *   - https://www.youtube.com/watch?v=VIDEO_ID
 *   - https://youtu.be/VIDEO_ID
 *   - https://www.youtube.com/embed/VIDEO_ID
 *   - https://www.youtube.com/shorts/VIDEO_ID
 *   - https://m.youtube.com/...
 */
export function extractVideoId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const patterns = [
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }

  return null;
}

export function isValidYouTubeUrl(url: string): boolean {
  return extractVideoId(url) !== null;
}

/**
 * Форматирует timestamp (ms) в читаемый вид HH:MM:SS.
 */
export function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Группирует субтитры в чанки по заданной длительности (в секундах).
 * Каждый чанк объединяет текст строк, входящих в интервал,
 * и сохраняет startTime/endTime, а также форматированный timestamp.
 */
export function splitIntoChunks(
  subtitles: Array<{ text: string; start: number; duration: number }>,
  chunkDurationInSeconds: number = 300
): Array<{
  chunkId: number;
  timestamp: string;
  text: string;
  startTime: number;
  endTime: number;
}> {
  if (!Array.isArray(subtitles) || subtitles.length === 0) {
    return [];
  }

  const chunkDurationMs = chunkDurationInSeconds * 1000;
  const chunks: Array<{
    chunkId: number;
    timestamp: string;
    text: string;
    startTime: number;
    endTime: number;
  }> = [];

  let current: Array<{ text: string; start: number; duration: number }> = [];
  let chunkStart = subtitles[0].start;
  let chunkEnd = subtitles[0].start + subtitles[0].duration;

  for (const sub of subtitles) {
    const subStart = typeof sub.start === "number" ? sub.start : 0;
    const subEnd = subStart + (typeof sub.duration === "number" ? sub.duration : 0);

    if (current.length === 0) {
      chunkStart = subStart;
      chunkEnd = subEnd;
      current.push(sub);
      continue;
    }

    // Если текущий чанк превысил лимит по времени — фиксируем и начинаем новый
    if (subStart - chunkStart >= chunkDurationMs) {
      const text = current.map((s) => s.text).join(" ");
      chunks.push({
        chunkId: chunks.length,
        timestamp: `${formatTimestamp(chunkStart)} - ${formatTimestamp(chunkEnd)}`,
        text,
        startTime: chunkStart,
        endTime: chunkEnd,
      });
      current = [sub];
      chunkStart = subStart;
      chunkEnd = subEnd;
    } else {
      current.push(sub);
      chunkEnd = Math.max(chunkEnd, subEnd);
    }
  }

  // Хвост
  if (current.length > 0) {
    const text = current.map((s) => s.text).join(" ");
    chunks.push({
      chunkId: chunks.length,
      timestamp: `${formatTimestamp(chunkStart)} - ${formatTimestamp(chunkEnd)}`,
      text,
      startTime: chunkStart,
      endTime: chunkEnd,
    });
  }

  return chunks;
}

/**
 * Разбивает субтитры на чанки по заданному размеру (в символах).
 * Каждый чанк сохраняет временные метки start/end.
 * Используется для отправки текста в ИИ-модель.
 */
export function chunkTranscript(
  segments: TranscriptResult["segments"],
  chunkSize = 1400,
  overlap = 200
): Chunk[] {
  const chunks: Chunk[] = [];
  let buffer = "";
  let chunkStart = segments[0]?.start ?? 0;
  let chunkEnd = segments[0]?.start ?? 0;
  let index = 0;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const candidate = buffer ? `${buffer} ${seg.text}` : seg.text;

    if (candidate.length > chunkSize && buffer.length > 0) {
      chunks.push({
        id: `chunk-${index}`,
        text: buffer.trim(),
        start: chunkStart,
        end: chunkEnd,
        index,
      });
      index++;

      const tail = buffer.slice(-overlap);
      buffer = tail ? `${tail} ${seg.text}` : seg.text;
      chunkStart = seg.start;
    } else {
      buffer = candidate;
    }
    chunkEnd = seg.start + seg.duration;
  }

  if (buffer.trim().length > 0) {
    chunks.push({
      id: `chunk-${index}`,
      text: buffer.trim(),
      start: chunkStart,
      end: chunkEnd,
      index,
    });
  }

  return chunks;
}

/**
 * Превращает сырые субтитры из youtube-transcript формата
 * в наш внутренний TranscriptResult.
 */
export function normalizeTranscript(
  raw: Array<{ text?: string; start?: number; duration?: number }>,
  videoId: string,
  meta: { title?: string; channel?: string; language?: string } = {}
): TranscriptResult {
  return {
    videoId,
    title: meta.title ?? `YouTube video ${videoId}`,
    channel: meta.channel ?? "Unknown channel",
    language: meta.language ?? "en",
    segments: raw
      .filter((s) => typeof s.text === "string" && s.text.trim().length > 0)
      .map((s) => ({
        text: s.text!.trim(),
        start: typeof s.start === "number" ? s.start : 0,
        duration: typeof s.duration === "number" ? s.duration : 0,
      })),
  };
}

/**
 * Декодирует HTML-сущности в тексте субтитров.
 */
function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&apos;/g, "'");
}

/**
 * Извлекает tracks из HTML-страницы YouTube.
 * Ищет window["ytInitialPlayerResponse"] = {...};
 */
function extractCaptionTracks(html: string): any[] {
  // Пробуем несколько паттернов для разных форматов страницы YouTube
  const patterns = [
    /window\["ytInitialPlayerResponse"\]\s*=\s*(\{[\s\S]*?\});/,
    /var\s+ytInitialPlayerResponse\s*=\s*(\{[\s\S]*?\});/,
    /ytInitialPlayerResponse\s*=\s*(\{[\s\S]*?\})\s*;/,
    /window\.ytInitialPlayerResponse\s*=\s*(\{[\s\S]*?\})/,
    /"ytInitialPlayerResponse"\s*:\s*(\{[\s\S]*?\})/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      try {
        // Очищаем от лишних escape-символов и парсим
        let jsonStr = match[1].replace(/\\x([0-9a-fA-F]{2})/g, "").replace(/\\u0026/g, "&");
        const parsed = JSON.parse(jsonStr);
        const tracks = parsed?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        if (Array.isArray(tracks) && tracks.length > 0) return tracks;
      } catch (err) {
        // Пробуем следующий паттерн
        continue;
      }
    }
  }

  // Fallback: ищем captionTracks в сыром JSON-образе
  const trackMatch = html.match(/"captionTracks"\s*:\s*(\[[\s\S]*?\])\s*,\s*"/);
  if (trackMatch) {
    try {
      const tracks = JSON.parse(trackMatch[1]);
      if (Array.isArray(tracks) && tracks.length > 0) return tracks;
    } catch {
      // continue
    }
  }

  return [];
}

/**
 * Парсит XML-субтитры YouTube (формат timedtext).
 * Поддерживает srv3 (<p t="ms" d="s">) и классический (<text start="s" dur="s">).
 * Использует гибкий разбор атрибутов, независимый от порядка.
 */
function parseTranscriptXml(xml: string): Array<{ text: string; start: number; duration: number }> {
  const result: Array<{ text: string; start: number; duration: number }> = [];

  // YouTube использует два формата:
  // 1. srv3: <p t="1234" d="5.6">Текст</p>  (t=ms, d=s)
  // 2. Классический: <text start="1.5" dur="3.0">Текст</text> (start=s, dur=s)

  // Общий regex для <p> с любыми атрибутами и многострочным текстом
  const pMatches = xml.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/g);
  for (const m of pMatches) {
    const attrs = m[1];
    const text = decodeHtml(m[2]).trim();
    if (!text) continue;

    const tMatch = attrs.match(/\bt="([\d.]+)"/);
    const dMatch = attrs.match(/\bd="([\d.]+)"/);

    if (tMatch && dMatch) {
      result.push({
        text,
        start: Number(tMatch[1]),
        duration: Number(dMatch[1]) * 1000,
      });
    }
  }
  if (result.length > 0) return result;

  // Общий regex для <text> с любыми атрибутами
  const textMatches = xml.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g);
  for (const m of textMatches) {
    const attrs = m[1];
    const text = decodeHtml(m[2]).trim();
    if (!text) continue;

    const startMatch = attrs.match(/\bstart="([\d.]+)"/);
    const durMatch = attrs.match(/\bdur="([\d.]+)"/);

    if (startMatch && durMatch) {
      result.push({
        text,
        start: Number(startMatch[1]) * 1000,
        duration: Number(durMatch[1]) * 1000,
      });
    }
  }

  return result;
}

/**
 * Получает субтитры YouTube напрямую через парсинг страницы.
 * Извлекает tracks из ytInitialPlayerResponse, затем грузит XML по baseUrl.
 * Возвращает массив { text, start, duration } (start/duration в миллисекундах).
 */
export async function fetchTranscript(
  videoId: string,
  lang: string = "en"
): Promise<Array<{ text: string; start: number; duration: number }>> {
  // 1. Грузим страницу видео
  const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const pageRes = await fetch(pageUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
    },
  });

  if (!pageRes.ok) {
    throw new Error(`Failed to fetch YouTube page: HTTP ${pageRes.status}`);
  }

  const html = await pageRes.text();
  const tracks = extractCaptionTracks(html);

  if (tracks.length === 0) {
    throw new Error("No captions available for this video");
  }

  // 2. Выбираем нужный трек (приоритет: указанный язык, иначе первый доступный)
  const track = tracks.find((t: any) => t.languageCode === lang) || tracks[0];
  const baseUrl = track?.baseUrl;
  if (!baseUrl) {
    throw new Error("Caption track has no baseUrl");
  }

  // 3. Грузим XML-субтитры (kind=asr для автогенерированных)
  const xmlUrl = baseUrl.includes("?") ? `${baseUrl}&kind=asr` : `${baseUrl}?kind=asr`;
  const xmlRes = await fetch(xmlUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
  });

  if (!xmlRes.ok) {
    // Пробуем без kind-параметра
    const fallbackRes = await fetch(baseUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    if (!fallbackRes.ok) {
      throw new Error(`Failed to fetch transcript XML: HTTP ${fallbackRes.status}`);
    }
    const xmlText = await fallbackRes.text();
    const parsed = parseTranscriptXml(xmlText);
    if (parsed.length === 0) throw new Error("No transcript entries found in XML");
    return parsed;
  }

  const xmlText = await xmlRes.text();
  const parsed = parseTranscriptXml(xmlText);
  if (parsed.length === 0) throw new Error("No transcript entries found in XML");
  return parsed;
}
