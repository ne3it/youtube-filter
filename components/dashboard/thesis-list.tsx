import { useState } from "react";
import type { Thesis } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { formatTimestamp } from "@/lib/youtube";

export interface ThesisListProps {
  theses: Thesis[];
}

export function ThesisList({ theses }: ThesisListProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (theses.length === 0) {
    return (
      <Card className="p-5 text-sm text-ink/50">
        No alternative theses extracted.
      </Card>
    );
  }

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold text-ink">Alternative theses</h3>
      <ul className="space-y-3">
        {theses.map((t) => (
          <li key={t.id} className="rounded-lg border border-line bg-paper/50 p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-ink">{t.claim}</p>
              <Badge variant="muted" size="sm">
                {Math.round(t.confidence * 100)}%
              </Badge>
            </div>
            {expanded.has(t.id) && (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-ink/70">{t.support}</p>
                <div className="flex items-center gap-2 text-xs text-ink/50">
                  <Badge variant="paper" size="sm">{formatTimestamp(t.timestamp)}</Badge>
                </div>
              </div>
            )}
            <div className="mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggle(t.id)}
              >
                {expanded.has(t.id) ? (
                  <><ChevronUp className="h-3 w-3" /> Hide</>
                ) : (
                  <><ChevronDown className="h-3 w-3" /> Show evidence</>
                )}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}