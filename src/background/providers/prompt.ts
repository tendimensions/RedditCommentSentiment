import type { RedditThreadDocument, RedditComment, AnalysisResult } from "../../shared/types";

const MAX_COMMENTS = 200;
const MAX_BODY_CHARS = 800;

export function buildPrompt(doc: RedditThreadDocument): string {
  const allComments = flattenComments(doc.comments);
  const total = allComments.length;
  const capped = allComments.slice(0, MAX_COMMENTS);

  const commentLines = capped
    .map((c, i) => {
      const indent = "  ".repeat(c.depth);
      const author = c.author ?? "[deleted]";
      const body =
        c.body.length > MAX_BODY_CHARS
          ? c.body.slice(0, MAX_BODY_CHARS) + "…"
          : c.body;
      return `${indent}[${i + 1}] ${author}: ${body}`;
    })
    .join("\n");

  const truncationNote =
    total > MAX_COMMENTS
      ? `\n\n(Note: thread truncated to ${MAX_COMMENTS} of ${total} comments for analysis.)`
      : "";

  return `Analyze the following Reddit comment thread and respond with a JSON object only — no markdown fences, no extra prose.

Post: "${doc.post.title}"
Subreddit: r/${doc.post.subreddit ?? "unknown"}
URL: ${doc.post.url}

Comments:
${commentLines}${truncationNote}

Respond with exactly this JSON structure:
{
  "summary": "2–4 sentence concise summary of the discussion",
  "overallSentiment": "positive" | "negative" | "mixed" | "neutral",
  "themes": ["theme 1", "theme 2"],
  "notableDisagreements": ["disagreement 1"]
}

Keep themes to 5 or fewer. Use an empty array for notableDisagreements if there are none.`;
}

function flattenComments(comments: RedditComment[]): RedditComment[] {
  const result: RedditComment[] = [];
  function traverse(list: RedditComment[]) {
    for (const c of list) {
      if (result.length >= MAX_COMMENTS) return;
      if (c.body.trim()) result.push(c);
      traverse(c.replies);
    }
  }
  traverse(comments);
  return result;
}

export function parseAnalysisResponse(text: string, raw: unknown): AnalysisResult {
  // Strip accidental markdown fences
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      `Could not parse LLM response as JSON. Got: ${text.slice(0, 300)}`
    );
  }

  if (!isValidAnalysis(parsed)) {
    throw new Error(
      `LLM response did not match expected structure. Got: ${text.slice(0, 300)}`
    );
  }

  return {
    summary: parsed.summary,
    overallSentiment: parsed.overallSentiment,
    themes: parsed.themes,
    notableDisagreements: parsed.notableDisagreements,
    rawResponse: raw,
  };
}

function isValidAnalysis(obj: unknown): obj is {
  summary: string;
  overallSentiment: "positive" | "negative" | "mixed" | "neutral";
  themes: string[];
  notableDisagreements: string[];
} {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o["summary"] === "string" &&
    ["positive", "negative", "mixed", "neutral"].includes(
      o["overallSentiment"] as string
    ) &&
    Array.isArray(o["themes"]) &&
    Array.isArray(o["notableDisagreements"])
  );
}
