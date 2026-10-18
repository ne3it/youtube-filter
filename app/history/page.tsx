"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Eye } from "lucide-react";
import { Header } from "@/components/shared/header";
import { Footer } from "@/components/shared/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHistory } from "@/hooks/use-local-storage";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { formatTimestamp } from "@/lib/youtube";

export default function HistoryPage() {
  const { entries, removeEntry, clear, isHydrated } = useHistory();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 mx-auto w-full max-w-content px-4 sm:px-6 py-8">
          <p className="text-sm text-ink/50">Loading history...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 mx-auto w-full max-w-content px-4 sm:px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/" className="inline-flex items-center gap-1 text-sm text-ink/60 hover:text-ink">
              <ArrowLeft className="h-4 w-4" />
              Back to analyzer
            </Link>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">
              Analysis history
            </h1>
            <p className="mt-1 text-sm text-ink/60">
              {entries.length} saved {entries.length === 1 ? "entry" : "entries"}
            </p>
          </div>
          {entries.length > 0 && (
            <Button variant="danger" size="sm" onClick={clear}>
              <Trash2 className="h-4 w-4" />
              Clear all
            </Button>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-10 text-center">
            <p className="text-ink/60">No analyses yet.</p>
            <p className="mt-1 text-sm text-ink/40">
              Go back and analyze your first YouTube video.
            </p>
            <Link href="/" className="mt-4 inline-block">
              <Button variant="accent" size="sm">
                Analyze a video
              </Button>
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {entries.map((entry) => (
              <li key={entry.id} className="rounded-xl border border-line bg-paper p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="accent" size="sm">
                        {formatTimestamp(0)}
                      </Badge>
                      <span className="text-xs text-ink/40">
                        {new Date(entry.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <h3 className="mt-2 truncate text-base font-semibold text-ink">
                      {entry.title}
                    </h3>
                    <p className="text-sm text-ink/60">{entry.channel}</p>
                    {entry.userFocus && (
                      <p className="mt-1 text-xs text-ink/50">
                        Focus: <span className="text-ink/70">{entry.userFocus}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                      aria-label="Toggle details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEntry(entry.id)}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>

                {expandedId === entry.id && (
                  <div className="mt-4 animate-fade-in">
                    <SummaryCard
                      userFocus={entry.userFocus}
                      summary={entry.result.summary}
                      coreConcept={entry.result.coreConcept}
                      dominantPerspective={
                        entry.result.theses.some((t) => t.confidence > 0.5)
                          ? "alternative"
                          : "consensus"
                      }
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>

      <Footer />
    </div>
  );
}