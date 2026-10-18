import { useMemo } from "react";
import type { WordCloudItem } from "@/types";
import { Card } from "@/components/ui/card";

export interface WordCloudProps {
  words: WordCloudItem[];
}

export function WordCloud({ words }: WordCloudProps) {
  const positioned = useMemo(() => {
    if (words.length === 0) return [];
    const sorted = [...words].sort((a, b) => b.weight - a.weight);
    const placed: Array<{ x: number; y: number; w: number }> = [];
    const maxW = 100;
    const grid: boolean[][] = Array.from({ length: 14 }, () =>
      Array.from({ length: 24 }, () => false)
    );

    return sorted.map((w, i) => {
      const fontSize = 11 + w.weight * 18;
      const cols = Math.max(2, Math.round((fontSize / 14) * 4));
      const rows = Math.max(1, Math.round((fontSize / 14) * 2));

      let x = 2;
      let y = 2;
      let placedFlag = false;

      for (let attempt = 0; attempt < 200 && !placedFlag; attempt++) {
        x = Math.floor(Math.random() * (24 - cols));
        y = Math.floor(Math.random() * (14 - rows));
        let overlap = false;
        for (let dy = 0; dy < rows && !overlap; dy++) {
          for (let dx = 0; dx < cols && !overlap; dx++) {
            if (grid[y + dy][x + dx]) overlap = true;
          }
        }
        if (!overlap) {
          for (let dy = 0; dy < rows; dy++) {
            for (let dx = 0; dx < cols; dx++) {
              grid[y + dy][x + dx] = true;
            }
          }
          placedFlag = true;
        }
      }

      if (!placedFlag) {
        x = i % 8;
        y = (i % 6) * 2;
      }

      placed.push({ x, y, w: cols });
      return { word: w, x, y, cols, rows, fontSize };
    });
  }, [words]);

  const sentimentColor = (s: WordCloudItem["sentiment"]) => {
    if (s === "positive") return "text-green-700";
    if (s === "negative") return "text-red-700";
    return "text-ink";
  };

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold text-ink">Lexical portrait</h3>
      <div className="relative h-[220px] w-full">
        {positioned.map((p, i) => (
          <span
            key={i}
            className={`absolute whitespace-nowrap font-medium ${sentimentColor(
              p.word.sentiment
            )}`}
            style={{
              left: `${(p.x / 24) * 100}%`,
              top: `${(p.y / 14) * 100}%`,
              fontSize: `${p.fontSize}px`,
              opacity: 0.6 + p.word.weight * 0.4,
            }}
          >
            {p.word.word}
          </span>
        ))}
      </div>
    </Card>
  );
}