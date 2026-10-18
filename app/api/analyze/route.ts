import { NextResponse } from "next/server";
import { analyzeWithAI, getProviderStatus } from "@/lib/ai";
import type { TranscriptResult, AnalysisRequest } from "@/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { transcript, userFocus } = body as {
      transcript: TranscriptResult;
      userFocus: string;
    };

    if (!transcript || !transcript.segments) {
      return NextResponse.json({ error: "Invalid transcript" }, { status: 400 });
    }

    const status = getProviderStatus();
    if (!status.configured) {
      return NextResponse.json(
        { error: "No AI provider configured", provider: status.provider },
        { status: 503 }
      );
    }

    const reqBody: AnalysisRequest = {
      videoId: transcript.videoId,
      title: transcript.title,
      chunks: transcript.segments.map((s, i) => ({
        chunkId: i,
        text: s.text,
        startTime: s.start,
        endTime: s.start + s.duration,
        timestamp: "",
      })),
      userFocus: userFocus || "general analysis",
    };

    const result = await analyzeWithAI(reqBody);

    return NextResponse.json({ result }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}