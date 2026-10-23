"use client";

import { useState, useEffect, useRef } from "react";
import { TimelineChart } from "@/components/dashboard/timeline-chart";
import { WordCloud } from "@/components/dashboard/word-cloud";
import { ThesisList } from "@/components/dashboard/thesis-list";
import { useHistory } from "@/hooks/use-local-storage";
import { extractVideoId } from "@/lib/youtube";
import type { HistoryEntry, LexicalStatsItem, TimelineDataItem } from "@/types";

const PRESETS = [
  { id: "academic", label: "Академический" },
  { id: "it", label: "Практический (IT)" },
  { id: "pop", label: "Поп-наука" },
] as const;

export default function Home() {
  const [url, setUrl] = useState("");
  const [focus, setFocus] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{
    lexicalStats: LexicalStatsItem[];
    timelineData: TimelineDataItem[];
  } | null>(null);
  const [activeChunkId, setActiveChunkId] = useState<number | null>(null);
  const [loaderStep, setLoaderStep] = useState(0);
  const thesisListRef = useRef<HTMLDivElement>(null);

  const { entries: history, addEntry, isHydrated } = useHistory();

  const loaderMessages = [
    "Скачиваем субтитры через Supadata...",
    "Фильтруем пустую воду...",
    "Сверяем тезисы с консенсусом через OpenRouter...",
  ];

  useEffect(() => {
    if (!isLoading) return;
    setLoaderStep(0);
    const interval = setInterval(() => {
      setLoaderStep((prev) => (prev + 1) % loaderMessages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [isLoading]);

  const timelineSegments = (analysisResult?.timelineData ?? []).map((t: any) => ({
    time: t.timestamp,
    type: t.perspective === "alternative" ? ("alternative" as const) : ("consensus" as const),
    score: t.score,
    label: t.summary,
  }));

  const handlePresetClick = (presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const next = selectedPreset === presetId ? null : presetId;
    setSelectedPreset(next);
    setFocus(next ? preset.label : "");
  };

  const handleAnalyze = async () => {
    if (!url.trim()) {
      setError("Введите ссылку на YouTube видео");
      return;
    }
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    setActiveChunkId(null);

    try {
      const videoId = extractVideoId(url.trim());
      if (!videoId) {
        throw new Error("Неверный формат ссылки");
      }

      const res = await fetch("/api/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Не удалось получить субтитры");
      }

      const { chunks = [] } = await res.json();

      if (!chunks.length) {
        throw new Error("Субтитры пусты или недоступны");
      }

      setAnalysisResult({ lexicalStats: [], timelineData: [] });

      const timelineData: any[] = [];
      for (const chunk of chunks) {
        await new Promise((r) => setTimeout(r, 1000));
        try {
          const analyzeRes = await fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chunk: {
                chunkId: chunk.chunkId,
                text: chunk.text,
                timestamp: chunk.timestamp,
              },
              userFocus: focus,
            }),
          });
          if (!analyzeRes.ok) {
            const err = await analyzeRes.json().catch(() => ({}));
            throw new Error(err.error || "Анализ не удался");
          }
          const aiResponse = await analyzeRes.json();
          timelineData.push(aiResponse);
          setAnalysisResult((prev) => ({
            lexicalStats: prev?.lexicalStats || [],
            timelineData: [...(prev?.timelineData || []), aiResponse as TimelineDataItem],
          }));
        } catch (err: any) {
          const fallback = {
            chunkId: chunk.chunkId,
            timestamp: chunk.timestamp,
            summary: "",
            perspective: "consensus",
            analysis: `Error: ${err instanceof Error ? err.message : "unknown"}`,
            score: 0,
            error: true,
          };
          timelineData.push(fallback);
          setAnalysisResult((prev) => ({
            lexicalStats: prev?.lexicalStats || [],
            timelineData: [...(prev?.timelineData || []), fallback as TimelineDataItem],
          }));
        }
      }

      const fullText = chunks.map((c: any) => c.text).join(" ");
      const wordCounts = new Map<string, number>();
      const STOP_WORDS = new Set([
        "и", "в", "во", "не", "что", "он", "на", "я", "с", "со", "как", "а", "то",
        "все", "всё", "всей", "всех", "она", "так", "его", "но", "да", "ты", "к", "у", "же", "вы", "за",
        "бы", "по", "только", "ее", "мне", "было", "быть", "есть", "уже", "еще", "ещё", "вот", "от", "меня", "нет", "о", "из", "до", "них", "ним", "ними", "этом", "эта", "эти",
        "этот", "это", "этих", "эту", "при", "ли", "ни", "чтобы",
        "чтоб", "если", "или", "когда", "потом", "тогда", "того", "значит", "сказать", "слова", "будет", "после", "хочу", "очень", "просто", "надо", "там", "они", "мы", "вы", "она", "оно", "его", "ее", "их", "тебе", "нам", "вам", "тебя",
        "ну", "так", "вот", "уже", "ещё", "только", "просто", "очень", "надо", "значит", "сказать", "будет", "после", "если", "хочу", "can", "the",
        "and", "to", "is", "of", "in", "that", "it", "this", "you", "well", "are", "very", "he", "all", "be", "on", "for", "with", "as",
      ]);
      for (const rawWord of fullText.split(/\s+/)) {
        const word = rawWord.toLowerCase().replace(/[^a-zа-яё0-9]/g, "");
        if (!word || word.length < 2 || STOP_WORDS.has(word)) continue;
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
      const stats = Array.from(wordCounts.entries())
        .map(([text, value]) => ({ text, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 15);

      setAnalysisResult({ lexicalStats: stats, timelineData: timelineData as TimelineDataItem[] });
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSegmentClick = (index: number) => {
    setActiveChunkId(index);
    setTimeout(() => {
      const el = document.getElementById(`thesis-chunk-${index}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 100);
  };

  const handleHistoryClick = (entry: HistoryEntry) => {
    const stats: LexicalStatsItem[] = entry.result.wordCloud.map((w: any) => ({
      text: w.word,
      value: Math.round(w.weight * 100),
    }));
    const timeline: TimelineDataItem[] = entry.result.theses.map((t: any, i: number) => ({
      chunkId: i,
      timestamp: "00:00 - 05:00",
      summary: t.claim,
      perspective: "consensus" as const,
      analysis: t.support,
      score: Math.round(t.confidence * 100),
    }));
    setAnalysisResult({ lexicalStats: stats, timelineData: timeline });
    setActiveChunkId(null);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <main className="flex flex-1 flex-col items-center px-4 py-16 sm:py-24">
        <div className="w-full max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Препарируйте смыслы YouTube
          </h1>
          <p className="mt-3 text-base text-muted">
            Умное самообразование без инфомусора
          </p>

          {isLoading ? (
            <div className="rounded-md border border-card-border bg-black/40 p-6 font-mono text-sm">
              <div className="flex items-center gap-2 text-brand-yellow">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-brand-yellow" />
                <span>YT.ANATOMY CONSOLE v0.1</span>
              </div>
              <div className="mt-3 space-y-1 text-muted">
                <p>{"> "}{loaderMessages[loaderStep]}</p>
                <p>{"> "}{loaderStep >= 1 ? "Фильтруем воду..." : "Ожидание..."}</p>
                <p>{"> "}{loaderStep >= 2 ? "Сверяем тезисы с консенсусом через OpenRouter..." : "Ожидание..."}</p>
              </div>
              <div className="mt-4 h-1 w-full overflow-hidden rounded bg-card-border">
                <div
                  className="h-full bg-brand-yellow transition-all duration-500"
                  style={{ width: `${((loaderStep + 1) / loaderMessages.length) * 100}%` }}
                />
              </div>
            </div>
          ) : (
          <div className="mt-10 space-y-6 text-left">
            <div>
              <input
                type="url"
                placeholder="Вставьте ссылку на YouTube видео..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
                className="w-full rounded-none border border-card-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-brand-yellow focus:shadow-neon-yellow focus:outline-none focus:ring-1 focus:ring-brand-yellow transition-all duration-200 disabled:opacity-50"
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                Направление анализа
              </p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((preset) => {
                  const isActive = selectedPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      disabled={isLoading}
                      onClick={() => handlePresetClick(preset.id)}
                      className={`rounded-none border px-3 py-1.5 text-sm transition-all duration-150 disabled:opacity-50 ${
                        isActive
                          ? "border-brand-yellow bg-brand-yellow text-ink shadow-neon-yellow"
                          : "border-card-border bg-card text-foreground hover:border-brand-yellow/60"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <input
                type="text"
                placeholder="Или укажите свой фокус (например: проверь теорию Х)..."
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                disabled={isLoading}
                className="w-full rounded-none border border-card-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-brand-yellow focus:shadow-neon-yellow focus:outline-none focus:ring-1 focus:ring-brand-yellow transition-all duration-200 disabled:opacity-50"
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={handleAnalyze}
                className="group w-full rounded-none bg-brand-yellow px-4 py-3 text-base font-semibold text-ink transition-all duration-150 hover:bg-[#FFD200] hover:shadow-neon-yellow active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Запустить анализ
              </button>
            </div>

            {error && (
              <div className="rounded-none border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}
          </div>
          )}

        </div>

        {analysisResult && (
          <div className="mt-12 w-full max-w-4xl space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <TimelineChart
                  data={timelineSegments}
                  onSegmentClick={handleSegmentClick}
                />
              </div>
              <div>
                <WordCloud
                  words={analysisResult.lexicalStats}
                  onTagClick={() => {}}
                />
              </div>
            </div>

            <div ref={thesisListRef}>
              <ThesisList
                items={analysisResult.timelineData}
                activeChunkId={activeChunkId}
                onChunkClick={setActiveChunkId}
              />
            </div>
          </div>
        )}

        {isHydrated && history.length > 0 && (
          <div className="mt-16 w-full max-w-4xl">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              История прошлых проверок
            </h3>
            <div className="space-y-3">
              {history.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => handleHistoryClick(entry)}
                  className="w-full rounded-lg border border-card-border bg-card p-3 text-left transition-colors hover:border-brand-yellow"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-brand-yellow">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                    <span className="text-xs text-muted">{entry.userFocus || "без фокуса"}</span>
                  </div>
                  <p className="mt-1 truncate text-sm text-foreground">
                    {entry.title}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
