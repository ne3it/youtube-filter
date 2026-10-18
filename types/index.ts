export interface TranscriptSegment {
  text: string;
  start: number; // milliseconds
  duration: number; // milliseconds
}

export interface TranscriptResult {
  videoId: string;
  title: string;
  channel: string;
  segments: TranscriptSegment[];
  language: string;
}

export interface Chunk {
  id: string;
  text: string;
  start: number; // ms
  end: number; // ms
  index: number;
}

export interface AnalysisRequest {
  videoId: string;
  title: string;
  chunks: Chunk[];
  userFocus: string; // кастомный фокус пользователя
}

export interface ConceptScore {
  concept: string;
  score: number; // 0-100
  weight: number; // 0-1
  evidence: string; // цитата из текста
  timestamp: number; // ms
}

export interface SemanticPoint {
  t: number; // ms — положение на оси времени
  density: number; // 0-1 — плотность смысла
  label: string;
}

export interface WordCloudItem {
  word: string;
  weight: number; // 0-1
  sentiment: "neutral" | "positive" | "negative";
}

export interface Thesis {
  id: string;
  claim: string;
  support: string; // аргумент из текста
  confidence: number; // 0-1
  timestamp: number; // ms
}

export interface AnalysisResult {
  videoId: string;
  title: string;
  channel: string;
  summary: string;
  conceptScores: ConceptScore[];
  semanticTimeline: SemanticPoint[];
  wordCloud: WordCloudItem[];
  theses: Thesis[];
  coreConcept: string;
  generatedAt: number; // ms timestamp
}

export interface HistoryEntry {
  id: string;
  videoId: string;
  url: string;
  title: string;
  channel: string;
  userFocus: string;
  result: AnalysisResult;
  createdAt: number;
}

export type Theme = "light" | "dark";