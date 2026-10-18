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
 * Получает субтитры YouTube через публичные endpoints.
 * Пробует несколько форматов: JSON (youtranscript.com) и XML (timedtext).
 * Возвращает массив { text, start, duration } (start/duration в миллисекундах).
 */
export async function fetchTranscript(
  videoId: string,
  lang: string = "en"
): Promise<Array<{ text: string; start: number; duration: number }>> {
  const endpoints = [
    `https://youtubetranscript.com/?v=${videoId}&lang=${lang}`,
    `https://youtubetranscript.com/?v=${videoId}`,
    `https://youtranscript.com/?v=${videoId}&lang=${lang}`,
  ];

  let lastError: Error | null = null;

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; YouTubeFilter/1.0)" },
      });
      if (!res.ok) {
        lastError = new Error(`HTTP ${res.status} for ${endpoint}`);
        continue;
      }
      const text = await res.text();

      // Попытка 1: JSON-массив {text, start, duration}
      try {
        const json = JSON.parse(text);
        if (Array.isArray(json) && json.length > 0) {
          return json.map((item: any) => ({
            text: typeof item.text === "string" ? decodeHtml(item.text) : "",
            start: Number(item.start) || 0,
            duration: Number(item.duration) || 0,
          })).filter((s) => s.text.trim().length > 0);
        }
      } catch {
        // Не JSON — пробуем XML
      }

      // Попытка 2: XML-разметка <text start="s" dur="s">...</text>
      const xmlMatches = text.matchAll(/<text\s+start="([\d.]+)"\s+dur="([\d.]+)"[^>]*>([^<]*)<\/text>/g);
      const result: Array<{ text: string; start: number; duration: number }> = [];
      for (const m of xmlMatches) {
        const decoded = decodeHtml(m[3]);
        if (decoded.trim().length === 0) continue;
        result.push({
          text: decoded,
          start: Number(m[1]) * 1000,
          duration: Number(m[2]) * 1000,
        });
      }
      if (result.length > 0) return result;

      // Попытка 3: srv3-формат <p t="ms" d="s">...</p>
      const srv3Matches = text.matchAll(/<p\s+t="(\d+)"\s+d="([\d.]+)"[^>]*>([^<]*)<\/p>/g);
      const srv3Result: Array<{ text: string; start: number; duration: number }> = [];
      for (const m of srv3Matches) {
        const decoded = decodeHtml(m[3]);
        if (decoded.trim().length === 0) continue;
        srv3Result.push({
          text: decoded,
          start: Number(m[1]),
          duration: Number(m[2]) * 1000,
        });
      }
      if (srv3Result.length > 0) return srv3Result;

      lastError = new Error(`No transcript entries found in response from ${endpoint}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error("Could not fetch transcript");
}