import { Badge } from "@/components/ui/badge";

export interface SummaryCardProps {
  userFocus: string;
  summary: string;
  coreConcept?: string;
  dominantPerspective?: "consensus" | "alternative";
}

export function SummaryCard({
  userFocus,
  summary,
  coreConcept,
  dominantPerspective = "consensus",
}: SummaryCardProps) {
  const isAlternative = dominantPerspective === "alternative";

  return (
    <div className="rounded-xl border border-card-border bg-card p-5">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Паспорт видео */}
        <div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-yellow" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Паспорт видео
            </h3>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-foreground">
            {summary || "Анализ не завершён."}
          </p>
          {coreConcept && (
            <p className="mt-2 text-xs text-muted">
              Главная гипотеза:{" "}
              <span className="text-foreground">{coreConcept}</span>
            </p>
          )}
          <div className="mt-3">
            <Badge
              variant={isAlternative ? "accent" : "success"}
              size="sm"
              dot
            >
              {isAlternative ? "Альтернативный взгляд" : "Общепринятый консенсус"}
            </Badge>
          </div>
        </div>

        {/* Статус концепции */}
        <div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-yellow" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Статус концепции
            </h3>
          </div>
          <div className="mt-2 rounded-md border border-card-border bg-background/40 p-3">
            <p className="text-xs text-muted">
              Запрос пользователя:
            </p>
            <p className="mt-1 font-mono text-sm text-foreground">
              {userFocus || "(не указан)"}
            </p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-muted">Соответствие автора</span>
              <span
                className={`font-mono text-xs font-semibold ${
                  isAlternative ? "text-brand-yellow" : "text-emerald-400"
                }`}
              >
                {isAlternative ? "АЛТ" : "СТАНДАРТ"}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              {isAlternative
                ? "Автор высказывает нестандартную точку зрения, сопоставимую с существующими альтернативными гипотезами в этой области."
                : "Автор следует общепринятым научным/индустриальным стандартам. Концепция подтверждается базой знаний."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}