import type { RedditThreadDocument, AnalysisResult, Settings } from "../../shared/types";
import type { ProviderClient } from "./types";
import { buildPrompt, parseAnalysisResponse } from "./prompt";

const DEFAULT_MODEL = "gpt-4o";

export class OpenAIClient implements ProviderClient {
  async analyze(doc: RedditThreadDocument, settings: Settings): Promise<AnalysisResult> {
    const model = settings.model.trim() || DEFAULT_MODEL;
    const prompt = buildPrompt(doc);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "(no body)");
      throw new Error(`OpenAI API error ${response.status}: ${body}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error("Unexpected response structure from OpenAI API.");
    }

    return parseAnalysisResponse(text, data);
  }
}
