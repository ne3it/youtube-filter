"use client";

import { useState, useEffect } from "react";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { TimelineChart } from "@/components/dashboard/timeline-chart";
import { WordCloud } from "@/components/dashboard/word-cloud";
import { ThesisList } from "@/components/dashboard/thesis-list";
import { useHistory } from "@/hooks/use-local-storage";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lexicalStats, setLexicalStats] = useState<LexicalStatsItem[]>([]);
  const [timelineData, setTimelineData] = useState<TimelineDataItem[]>([]);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [activeChunkId, setActiveChunkId] = useState<number | null>(null);
const [summary, setSummary] = useState("");
  const [coreConcept, setCoreConcept] = useState("");
  const [dominantPerspective, setDominantPerspective] = useState<"consensus" | "alternative">("consensus");
  const [manualText, setManualText] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [loaderStep, setLoaderStep] = useState(0);

  const { entries: history, addEntry, isHydrated } = useHistory();

  // Циклические сообщения лоадера
  const loaderMessages = [
    "Скачиваем автоматические субтитры...",
    "Фильтруем пустую воду...",
    "Сверяем тезисы автора с научным консенсусом...",
  ];

  useEffect(() => {
    if (!loading) return;
    setLoaderStep(0);
    const interval = setInterval(() => {
      setLoaderStep((prev) => (prev + 1) % loaderMessages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [loading]);

  const timelineSegments = timelineData.map((t) => ({
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
    setLoading(true);
    setError(null);
    setLexicalStats([]);
    setTimelineData([]);
    setSelectedWord(null);
    setActiveChunkId(null);
    setSummary("");
    setCoreConcept("");

    try {
      // 1. Получаем чанки субтитров
      const transcriptRes = await fetch("/api/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const transcriptData = await transcriptRes.json();

      // Проверяем, требуется ли ручной ввод
      if (transcriptData.requiresManualInput) {
        setShowManualInput(true);
        setError("YouTube ограничил автоматический доступ. Вставьте текст субтитров вручную.");
        setLoading(false);
        return;
      }

      if (!transcriptRes.ok) {
        throw new Error(transcriptData.error || "Не удалось получить субтитры");
      }
      const { videoId, chunks } = transcriptData;

      // 2. Отправляем чанки в ИИ
      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chunks: chunks.map((c: any) => ({
            chunkId: c.chunkId,
            text: c.text,
            timestamp: c.timestamp,
          })),
          userFocus: focus,
        }),
      });
      if (!analyzeRes.ok) {
        const err = await analyzeRes.json();
        throw new Error(err.error || "Анализ не удался");
      }
      const data = await analyzeRes.json();
      const stats = data.lexicalStats || [];
      const timeline = data.timelineData || [];
      setLexicalStats(stats);
      setTimelineData(timeline);

      // Агрегируем summary из первых чанков
      const aggregatedSummary = timeline
        .map((t: TimelineDataItem) => t.summary)
        .filter(Boolean)
        .slice(0, 2)
        .join(" ");
      setSummary(aggregatedSummary || "Анализ завершён.");

      // Определяем доминантную позицию
      const altCount = timeline.filter((t: TimelineDataItem) => t.perspective === "alternative").length;
      const consensusCount = timeline.filter((t: TimelineDataItem) => t.perspective === "consensus").length;
      setDominantPerspective(altCount > consensusCount ? "alternative" : "consensus");

      // 3. Сохраняем в историю
      const entry: HistoryEntry = {
        id: `${videoId}-${Date.now()}`,
        videoId,
        url: url.trim(),
        title: `YouTube video ${videoId}`,
        channel: "Unknown channel",
        userFocus: focus,
        result: {
          videoId,
          title: `YouTube video ${videoId}`,
          channel: "Unknown channel",
          summary: aggregatedSummary,
          conceptScores: [],
          semanticTimeline: [],
          wordCloud: stats.map((l: LexicalStatsItem) => ({
            word: l.text,
            weight: l.value / (stats[0]?.value || 1),
            sentiment: "neutral" as const,
          })),
          theses: timeline.map((t: TimelineDataItem) => ({
            id: `thesis-${t.chunkId}`,
            claim: t.summary,
            support: t.analysis,
            confidence: t.score / 100,
            timestamp: t.chunkId * 60000,
          })),
          coreConcept: stats[0]?.text || "",
          generatedAt: Date.now(),
        },
        createdAt: Date.now(),
      };
      addEntry(entry);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!manualText.trim()) {
      setError("Введите текст субтитров");
      return;
    }
    setLoading(true);
    setError(null);
    setLexicalStats([]);
    setTimelineData([]);
    setSelectedWord(null);
    setActiveChunkId(null);
    setSummary("");
    setCoreConcept("");

    try {
      const transcriptRes = await fetch("/api/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), manualText: manualText.trim() }),
      });
      if (!transcriptRes.ok) {
        const err = await transcriptRes.json();
        throw new Error(err.error || "Не удалось обработать текст");
      }
      const { videoId, chunks } = await transcriptRes.json();

      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chunks: chunks.map((c: any) => ({
            chunkId: c.chunkId,
            text: c.text,
            timestamp: c.timestamp,
          })),
          userFocus: focus,
        }),
      });
      if (!analyzeRes.ok) {
        const err = await analyzeRes.json();
        throw new Error(err.error || "Анализ не удался");
      }
      const data = await analyzeRes.json();
      const stats = data.lexicalStats || [];
      const timeline = data.timelineData || [];
      setLexicalStats(stats);
      setTimelineData(timeline);

      const aggregatedSummary = timeline
        .map((t: TimelineDataItem) => t.summary)
        .filter(Boolean)
        .slice(0, 2)
        .join(" ");
      setSummary(aggregatedSummary || "Анализ завершён.");

      const altCount = timeline.filter((t: TimelineDataItem) => t.perspective === "alternative").length;
      const consensusCount = timeline.filter((t: TimelineDataItem) => t.perspective === "consensus").length;
      setDominantPerspective(altCount > consensusCount ? "alternative" : "consensus");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setLoading(false);
    }
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

          {/* Форма */}
          {loading ? (
            <div className="rounded-md border border-card-border bg-black/40 p-6 font-mono text-sm">
              <div className="flex items-center gap-2 text-brand-yellow">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-brand-yellow" />
                <span>YT.ANATOMY CONSOLE v0.1</span>
              </div>
              <div className="mt-3 space-y-1 text-muted">
                <p>{"> "}{loaderMessages[loaderStep]}</p>
                <p>{"> "}{loaderStep >= 1 ? "Фильтруем пустую воду..." : "Ожидание..."}</p>
                <p>{"> "}{loaderStep >= 2 ? "Сверяем тезисы..." : "Ожидание..."}</p>
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
                disabled={loading}
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
                      disabled={loading}
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
                disabled={loading}
                className="w-full rounded-none border border-card-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-brand-yellow focus:shadow-neon-yellow focus:outline-none focus:ring-1 focus:ring-brand-yellow transition-all duration-200 disabled:opacity-50"
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                disabled={loading}
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

            {/* Ручной ввод субтитров */}
            {showManualInput && (
              <div className="mt-3 space-y-3">
                <textarea
                  placeholder="Вставьте текст субтитров вручную (каждая строка — фрагмент)..."
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  rows={6}
                  className="w-full resize-y rounded-none border border-card-border bg-black/40 p-3 font-mono text-sm text-foreground placeholder:text-muted focus:border-brand-yellow focus:shadow-neon-yellow focus:outline-none focus:ring-1 focus:ring-brand-yellow transition-all duration-200"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleManualSubmit}
                    className="flex-1 rounded-none bg-brand-yellow px-4 py-2 text-sm font-semibold text-ink transition-all duration-150 hover:bg-[#FFD200] hover:shadow-neon-yellow disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Анализировать текст
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setShowManualInput(false);
                      setManualText("");
                      setError(null);
                    }}
                    className="rounded-none border border-card-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-card"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>
          )}
        </div>

        {/* Результаты анализа */}
        {timelineData.length > 0 && (
          <div className="mt-12 w-full max-w-4xl space-y-6 animate-fade-in">
            <SummaryCard
              userFocus={focus}
              summary={summary}
              coreConcept={coreConcept}
              dominantPerspective={dominantPerspective}
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <TimelineChart
                  data={timelineSegments}
                  onSegmentClick={setActiveChunkId}
                />
              </div>
              <div>
                <WordCloud
                  words={lexicalStats}
                  onTagClick={setSelectedWord}
                />
              </div>
            </div>

            <ThesisList
              items={timelineData}
              activeChunkId={activeChunkId}
              onChunkClick={setActiveChunkId}
            />
          </div>
        )}

        {/* История проверок */}
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
                  onClick={() => {
                    setLexicalStats(
                      entry.result.wordCloud.map((w) => ({
                        text: w.word,
                        value: Math.round(w.weight * 100),
                      }))
                    );
                    setTimelineData(entry.result.theses.map((t, i) => ({
                      chunkId: i,
                      timestamp: "00:00 - 05:00",
                      summary: t.claim,
                      perspective: "consensus" as const,
                      analysis: t.support,
                      score: Math.round(t.confidence * 100),
                    })));
                    setSummary(entry.result.summary);
                    setCoreConcept(entry.result.coreConcept);
                    setActiveChunkId(null);
                  }}
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