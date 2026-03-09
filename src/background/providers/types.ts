import type { RedditThreadDocument, AnalysisResult, Settings } from "../../shared/types";

export interface ProviderClient {
  analyze(doc: RedditThreadDocument, settings: Settings): Promise<AnalysisResult>;
}
