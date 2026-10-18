"use client";

import { useState } from "react";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { TimelineChart } from "@/components/dashboard/timeline-chart";
import { WordCloud } from "@/components/dashboard/word-cloud";
import { ThesisList } from "@/components/dashboard/thesis-list";
import type { AnalysisResult } from "@/types";

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
  const [result, setResult] = useState<AnalysisResult | null>(null);

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
    setResult(null);

    try {
      // 1. Получаем чанки субтитров
      const transcriptRes = await fetch("/api/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!transcriptRes.ok) {
        const err = await transcriptRes.json();
        throw new Error(err.error || "Не удалось получить субтитры");
      }
      const { videoId, chunks } = await transcriptRes.json();

      // 2. Отправляем чанки в ИИ
      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: {
            videoId,
            segments: chunks.map((c: any) => ({
              text: c.text,
              start: c.startTime,
              duration: Math.max(0, c.endTime - c.startTime),
            })),
            title: "",
            channel: "",
            language: "ru",
          },
          userFocus: focus,
        }),
      });
      if (!analyzeRes.ok) {
        const err = await analyzeRes.json();
        throw new Error(err.error || "Анализ не удался");
      }
      const data = await analyzeRes.json();
      setResult(data.result);
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
                {loading ? "Анализ..." : "Запустить анализ"}
              </button>
            </div>

            {error && (
              <div className="rounded-none border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Результаты анализа */}
        {result && (
          <div className="mt-12 w-full max-w-4xl space-y-6 animate-fade-in">
            <SummaryCard result={result} userFocus={focus} />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <TimelineChart points={result.semanticTimeline} />
              </div>
              <div>
                <WordCloud words={result.wordCloud} />
              </div>
            </div>
            <ThesisList theses={result.theses} />
          </div>
        )}

        {/* Место под историю проверок */}
        <div className="mt-16 w-full max-w-2xl">
          <div className="rounded-none border border-dashed border-card-border bg-card/40 p-6">
            <p className="text-center text-sm text-muted">
              История проверок (подключим LocalStorage позже)
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}