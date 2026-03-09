export type Provider = "anthropic" | "openai";

export type Settings = {
  provider: Provider;
  apiKey: string;
  model: string; // empty string = use provider default
};

export type RedditPost = {
  id: string | null;
  url: string;
  subreddit: string | null;
  title: string;
  author: string | null;
};

export type RedditComment = {
  id: string | null;
  author: string | null;
  body: string;
  score: number | null;
  createdUtc: string | null;
  depth: number;
  parentId: string | null;
  permalink: string | null;
  replies: RedditComment[];
};

export type RedditThreadDocument = {
  source: "reddit";
  capturedAt: string;
  post: RedditPost;
  comments: RedditComment[];
};

export type AnalysisResult = {
  summary: string;
  overallSentiment: "positive" | "negative" | "mixed" | "neutral";
  themes: string[];
  notableDisagreements: string[];
  rawResponse?: unknown;
};
