import type { RedditThreadDocument, AnalysisResult, Settings } from "../../shared/types";
import type { ProviderClient } from "./types";
import { buildPrompt, parseAnalysisResponse } from "./prompt";

const DEFAULT_MODEL = "claude-sonnet-4-6";

export class AnthropicClient implements ProviderClient {
  async analyze(doc: RedditThreadDocument, settings: Settings): Promise<AnalysisResult> {
    const model = settings.model.trim() || DEFAULT_MODEL;
    const prompt = buildPrompt(doc);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": settings.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "(no body)");
      throw new Error(`Anthropic API error ${response.status}: ${body}`);
    }

    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = data.content?.find((b) => b.type === "text")?.text;
    if (!text) {
      throw new Error("Unexpected response structure from Anthropic API.");
    }

    return parseAnalysisResponse(text, data);
  }
}
