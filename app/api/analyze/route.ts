import { NextResponse } from "next/server";
import { chunkTranscript } from "@/lib/youtube";
import { analyzeWithAI, getProviderStatus } from "@/lib/ai";
import type { TranscriptResult } from "@/types";

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

    const chunks = chunkTranscript(transcript.segments);

    const result = await analyzeWithAI({
      videoId: transcript.videoId,
      title: transcript.title,
      chunks,
      userFocus: userFocus || "general analysis",
    });

    return NextResponse.json({ result, chunks });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}