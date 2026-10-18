import type { TranscriptResult, Chunk } from "@/types";

/**
 * Извлекает videoId из различных форматов ссылок YouTube.
 * Поддерживает:
 *   - https://www.youtube.com/watch?v=VIDEO_ID
 *   - https://youtu.be/VIDEO_ID
 *   - https://www.youtube.com/embed/VIDEO_ID
 *   - https://www.youtube.com/shorts/VIDEO_ID
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
 * Разбивает субтитры на чанки по заданному размеру (в символах).
 * Каждый чанк сохраняет временные метки start/end.
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

      // перекрытие: берём хвост предыдущего буфера
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
 * Простая оценка перекрытия временных меток при нарезке.
 */
export function estimateChunkOverlap(
  segments: TranscriptResult["segments"],
  chunkSize = 1400
): number {
  if (segments.length === 0) return 0;
  const totalText = segments.map((s) => s.text).join(" ");
  const estimatedChunks = Math.max(1, Math.ceil(totalText.length / chunkSize));
  return estimatedChunks;
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
 * Превращает сырые субтитры из YouTube IFrame API/youtranscript формата
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