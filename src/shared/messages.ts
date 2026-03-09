import type { RedditThreadDocument, AnalysisResult } from "./types";

export type ExtractMessage = {
  type: "EXTRACT";
};

export type ExtractResponse =
  | { success: true; document: RedditThreadDocument }
  | { success: false; error: string };

export type AnalyzeMessage = {
  type: "ANALYZE";
  document: RedditThreadDocument;
};

export type AnalyzeResponse =
  | { success: true; result: AnalysisResult }
  | { success: false; error: string };
