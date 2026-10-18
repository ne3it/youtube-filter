"use client";

import { useState } from "react";

const PRESETS = [
  { id: "academic", label: "Академический" },
  { id: "it", label: "Практический (IT)" },
  { id: "pop", label: "Поп-наука" },
] as const;

export default function Home() {
  const [url, setUrl] = useState("");
  const [focus, setFocus] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const handlePresetClick = (presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const next = selectedPreset === presetId ? null : presetId;
    setSelectedPreset(next);
    setFocus(next ? preset.label : "");
  };

  const handleAnalyze = () => {
    alert(`URL: ${url || "(не указана)"}\nФокус: ${focus || "(по умолчанию)"}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 sm:py-24">
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
                className="w-full rounded-none border border-card-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-brand-yellow focus:shadow-neon-yellow focus:outline-none focus:ring-1 focus:ring-brand-yellow transition-all duration-200"
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
                      onClick={() => handlePresetClick(preset.id)}
                      className={`rounded-none border px-3 py-1.5 text-sm transition-all duration-150 ${
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
                className="w-full rounded-none border border-card-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-brand-yellow focus:shadow-neon-yellow focus:outline-none focus:ring-1 focus:ring-brand-yellow transition-all duration-200"
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleAnalyze}
                className="group w-full rounded-none bg-brand-yellow px-4 py-3 text-base font-semibold text-ink transition-all duration-150 hover:bg-[#FFD200] hover:shadow-neon-yellow active:scale-[0.99]"
              >
                Запустить анализ
              </button>
            </div>
          </div>
        </div>

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