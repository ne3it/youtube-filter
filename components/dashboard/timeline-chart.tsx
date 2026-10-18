import { useState } from "react";
import type { TimelineSegment } from "@/types";

export interface TimelineChartProps {
  data: TimelineSegment[];
  onSegmentClick?: (index: number) => void;
}

export function TimelineChart({ data, onSegmentClick }: TimelineChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-card-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground">
          Анатомический срез хронометража
        </h3>
        <p className="mt-3 text-sm text-muted">
          Нет данных для отображения.
        </p>
      </div>
    );
  }

  const barColor = (type: TimelineSegment["type"]) => {
    switch (type) {
      case "consensus":
        return "bg-emerald-500/80";
      case "alternative":
        return "bg-brand-yellow";
      case "water":
      default:
        return "bg-neutral-800";
    }
  };

  const hoverBrighten = (type: TimelineSegment["type"]) => {
    switch (type) {
      case "consensus":
        return "bg-emerald-400";
      case "alternative":
        return "bg-[#FFE066]";
      case "water":
      default:
        return "bg-neutral-700";
    }
  };

  return (
    <div className="rounded-xl border border-card-border bg-card p-5">
      <h3 className="text-sm font-semibold text-foreground">
        Анатомический срез хронометража
      </h3>

      <div className="mt-4 flex items-end justify-between gap-1" style={{ height: 180 }}>
        {data.map((segment, i) => {
          const heightPct = Math.max(8, segment.score);
          const isHover = hoverIndex === i;

          return (
            <div
              key={i}
              className="group relative flex flex-1 flex-col items-center"
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
            >
              <div
                className={`w-full max-w-[28px] rounded-sm transition-all duration-200 ${
                  isHover ? hoverBrighten(segment.type) : barColor(segment.type)
                }`}
                style={{ height: `${heightPct}%` }}
                onClick={() => onSegmentClick?.(i)}
              />

              {isHover && (
                <div className="pointer-events-none absolute -top-16 z-20 w-40 rounded-md border border-card-border bg-background px-2 py-1.5 text-xs shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-foreground">{segment.time}</span>
                    <span
                      className={`rounded px-1 py-0.5 text-[10px] font-medium ${
                        segment.type === "consensus"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : segment.type === "alternative"
                            ? "bg-brand-yellow/20 text-brand-yellow"
                            : "bg-neutral-700 text-neutral-300"
                      }`}
                    >
                      {segment.type}
                    </span>
                  </div>
                  <p className="mt-1 text-muted">{segment.label}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}