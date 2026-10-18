"use client";

import { useState } from "react";
import { Header } from "@/components/shared/header";
import { Footer } from "@/components/shared/footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { TimelineChart } from "@/components/dashboard/timeline-chart";
import { WordCloud } from "@/components/dashboard/word-cloud";
import { ThesisList } from "@/components/dashboard/thesis-list";
import { useHistory } from "@/hooks/use-local-storage";
import { extractVideoId, isValidYouTubeUrl } from "@/lib/youtube";
import type { AnalysisResult, HistoryEntry, TranscriptResult } from "@/types";

export default function Page() {
  const [url, setUrl] = useState("");
  const [focus, setFocus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [transcript, setTranscript] = useState<TranscriptResult | null>(null);
  const { addEntry } = useHistory();

  const isValid = isValidYouTubeUrl(url);

  const handleAnalyze = async () => {
    if (!isValid) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setTranscript(null);

    try {
      const videoId = extractVideoId(url)!;

      const transcriptRes = await fetch(`/api/transcript?url=${encodeURIComponent(url)}`);
      if (!transcriptRes.ok) {
        const err = await transcriptRes.json();
        throw new Error(err.error || "Failed to fetch transcript");
      }
      const transcriptData: TranscriptResult = await transcriptRes.json();
      setTranscript(transcriptData);

      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: transcriptData, userFocus: focus }),
      });
      if (!analyzeRes.ok) {
        const err = await analyzeRes.json();
        throw new Error(err.error || "Analysis failed");
      }
      const analyzeData = await analyzeRes.json();
      const analysisResult: AnalysisResult = analyzeData.result;
      setResult(analysisResult);

      const entry: HistoryEntry = {
        id: `${videoId}-${Date.now()}`,
        videoId,
        url,
        title: analysisResult.title,
        channel: analysisResult.channel,
        userFocus: focus,
        result: analysisResult,
        createdAt: Date.now(),
      };
      addEntry(entry);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 mx-auto w-full max-w-content px-4 sm:px-6 py-8">
        {/* Hero / input */}
        <section className="mx-auto max-w-2xl">
          <div className="text-center">
            <Badge variant="accent" size="sm" className="mb-4">
              AI anatomical concept filter
            </Badge>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink">
              Extract the conceptual skeleton of any YouTube video
            </h1>
            <p className="mt-3 text-base text-ink/60">
              Paste a link, optionally add a focus, and let the free LLM API
              map the video into concepts, timeline, and alternative theses.
            </p>
          </div>

          <div className="mt-8 space-y-3">
            <Input
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="h-12 text-base"
            />
            <Input
              type="text"
              placeholder="Custom focus (optional) — e.g. 'political framing'"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              className="h-11"
            />
            <div className="flex items-center gap-3">
              <Button
                variant="accent"
                size="lg"
                className="flex-1"
                onClick={handleAnalyze}
                disabled={!isValid || loading}
              >
                {loading ? "Analyzing..." : "Analyze video"}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  setUrl("");
                  setFocus("");
                  setResult(null);
                  setTranscript(null);
                  setError(null);
                }}
                disabled={loading}
              >
                Clear
              </Button>
            </div>
            {!isValid && url.length > 0 && (
              <p className="text-xs text-red-600">Please enter a valid YouTube URL.</p>
            )}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        </section>

        {/* Results */}
        {result && (
          <section className="mt-10 animate-fade-in">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <SummaryCard result={result} userFocus={focus} />
              </div>
              <div>
                <WordCloud words={result.wordCloud} />
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <TimelineChart points={result.semanticTimeline} />
              <ThesisList theses={result.theses} />
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}