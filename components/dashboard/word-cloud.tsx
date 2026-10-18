import { Tag } from "lucide-react";
import type { LexicalStatsItem } from "@/types";

export interface WordCloudProps {
  words: LexicalStatsItem[];
  onTagClick?: (word: string) => void;
}

export function WordCloud({ words, onTagClick }: WordCloudProps) {
  if (!words || words.length === 0) {
    return (
      <div className="rounded-xl border border-card-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted" />
          <h3 className="text-sm font-semibold text-foreground">
            Лексический портрет видео
          </h3>
        </div>
        <p className="mt-3 text-sm text-muted">
          Нет ключевых слов для отображения.
        </p>
      </div>
    );
  }

  const maxValue = words[0]?.value || 1;

  return (
    <div className="rounded-xl border border-card-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-muted" />
        <h3 className="text-sm font-semibold text-foreground">
          Лексический портрет видео
        </h3>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {words.map((item) => {
          const ratio = item.value / maxValue; // 0..1
          const fontSize = ratio > 0.7 ? "text-xl" : ratio > 0.4 ? "text-base" : "text-sm";
          const opacity = ratio > 0.7 ? "1" : ratio > 0.4 ? "0.8" : "0.55";
          const isInteractive = !!onTagClick;

          return (
            <button
              key={item.text}
              type="button"
              onClick={() => onTagClick?.(item.text)}
              disabled={!isInteractive}
              className={`group inline-flex items-center rounded-md border border-card-border bg-background/40 px-2 py-0.5 font-medium text-foreground transition-all duration-200 ${fontSize} hover:border-brand-yellow hover:bg-brand-yellow/10 hover:text-brand-yellow hover:shadow-[0_0_12px_rgba(255,199,0,0.4)] hover:scale-105 disabled:cursor-default disabled:hover:scale-100 disabled:hover:border-card-border disabled:hover:bg-background/40 disabled:hover:text-foreground disabled:hover:shadow-none`}
              style={{ opacity }}
            >
              {item.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}