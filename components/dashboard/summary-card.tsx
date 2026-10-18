import type { AnalysisResult, ConceptScore } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatTimestamp } from "@/lib/youtube";

export interface SummaryCardProps {
  result: AnalysisResult;
  userFocus?: string;
}

export function SummaryCard({ result, userFocus }: SummaryCardProps) {
  const topConcept = result.conceptScores[0];

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="accent" size="sm">
          Analysis
        </Badge>
        <Badge variant="muted" size="sm">
          {formatTimestamp(0)} — {formatTimestamp(result.semanticTimeline[result.semanticTimeline.length - 1]?.t ?? 0)}
        </Badge>
      </div>

      <h3 className="mt-3 text-lg font-semibold leading-snug text-ink">
        {result.title}
      </h3>
      <p className="mt-1 text-sm text-ink/60">{result.channel}</p>

      <p className="mt-3 text-sm leading-relaxed text-ink/80">{result.summary}</p>

      {result.coreConcept && (
        <div className="mt-4 rounded-lg border border-line bg-paper/50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-ink/50">
            Core concept
          </p>
          <p className="mt-1 text-sm font-medium text-ink">{result.coreConcept}</p>
        </div>
      )}

      {userFocus && (
        <div className="mt-3 rounded-lg border border-accent/40 bg-accent/5 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-ink/50">
            Your focus
          </p>
          <p className="mt-1 text-sm text-ink">{userFocus}</p>
        </div>
      )}

      {topConcept && (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink/50">
            Dominant concept
          </p>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
              <div
                className="h-full bg-accent transition-all duration-500"
                style={{ width: `${topConcept.score}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-ink">
              {topConcept.score}%
            </span>
            <span className="text-sm text-ink">{topConcept.concept}</span>
          </div>
        </div>
      )}
    </Card>
  );
}