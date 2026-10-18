import { useState, useEffect, useRef } from "react";
import type { TimelineDataItem } from "@/types";
import { ChevronDown, ChevronUp } from "lucide-react";

export interface ThesisListProps {
  items: TimelineDataItem[];
  activeChunkId?: string | number | null;
  onChunkClick?: (chunkId: number) => void;
}

export function ThesisList({ items, activeChunkId, onChunkClick }: ThesisListProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const itemRefs = useRef<Map<number, HTMLLIElement>>(new Map());

  // Автоматический скролл к активному элементу
  useEffect(() => {
    if (activeChunkId == null) return;
    const el = itemRefs.current.get(Number(activeChunkId));
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [activeChunkId]);

  if (!items || items.length === 0) {
    return (
      <div className="rounded-xl border border-card-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground">
          ИИ-рецензии по чанкам
        </h3>
        <p className="mt-3 text-sm text-muted">
          Нет рецензий для отображения.
        </p>
      </div>
    );
  }

  const toggle = (chunkId: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(chunkId)) next.delete(chunkId);
      else next.add(chunkId);
      return next;
    });
  };

  const setRef = (chunkId: number, el: HTMLLIElement | null) => {
    if (el) itemRefs.current.set(chunkId, el);
    else itemRefs.current.delete(chunkId);
  };

  return (
    <div className="rounded-xl border border-card-border bg-card p-5">
      <h3 className="text-sm font-semibold text-foreground">
        ИИ-рецензии по чанкам
      </h3>

      <ul className="mt-3 space-y-3">
        {items.map((item) => {
          const chunkId = item.chunkId;
          const isActive = activeChunkId != null && Number(activeChunkId) === chunkId;
          const isAlternative = item.perspective === "alternative";
          const isExpanded = expanded.has(chunkId);

          return (
            <li
              key={chunkId}
              ref={(el) => setRef(chunkId, el)}
              id={`thesis-chunk-${chunkId}`}
              className={`rounded-lg border p-3 transition-all duration-200 ${
                isActive
                  ? "border-brand-yellow bg-brand-yellow/5 shadow-[0_0_12px_rgba(255,199,0,0.15)]"
                  : "border-card-border bg-background/40 hover:border-card-border/80"
              }`}
              onClick={() => onChunkClick?.(chunkId)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-brand-yellow">
                    {item.timestamp}
                  </span>
                  {isAlternative ? (
                    <span className="inline-flex items-center gap-1 rounded bg-brand-yellow/20 px-1.5 py-0.5 text-[10px] font-medium text-brand-yellow">
                      Альтернативный взгляд
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                      Общепринятый консенсус
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted">score: {item.score}</span>
              </div>

              <p className="mt-2 text-sm text-foreground">{item.summary}</p>

              {isAlternative && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(chunkId);
                    }}
                    className="inline-flex items-center gap-1 text-xs text-brand-yellow hover:text-brand-yellow/80"
                  >
                    {isExpanded ? (
                      <><ChevronUp className="h-3 w-3" /> Скрыть мнение ИИ</>
                    ) : (
                      <><ChevronDown className="h-3 w-3" /> Показать мнение ИИ</>
                    )}
                  </button>

                  {isExpanded && (
                    <div className="mt-2 rounded-md border border-card-border bg-background/60 p-3">
                      <p className="text-xs font-medium text-muted">Промежуточное мнение ИИ</p>
                      <p className="mt-1 text-sm text-foreground/80">{item.analysis}</p>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}