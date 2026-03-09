# Design

## 1. Overview

The extension is a Manifest V3 browser extension that lets the user click a `Summarize` action, validates the active tab as a supported Reddit post page, extracts Reddit comments into a JSON document, and then either exports that document or sends it to an LLM provider for analysis.

The design prioritizes:

- Separation between page extraction and network calls
- Minimal permissions
- Stable internal data contracts
- A provider abstraction for future LLM flexibility

## 2. Proposed Components

### 2.1 Content script

Responsibilities:

- Detect whether the current page is a supported Reddit post page.
- Validate the active tab URL when summarization is requested.
- Validate that the expected Reddit DOM structure is present.
- Read the DOM for post and comment data.
- Convert raw DOM data into a normalized in-memory structure.
- Return the normalized payload to the popup or background worker.

Notes:

- This layer should not hold API keys.
- This layer should not call external LLM APIs directly.

### 2.2 Popup UI

Responsibilities:

- Present extraction status.
- Present a `Summarize` action.
- Trigger validation and comment extraction.
- After successful extraction, offer:
  - `Save JSON`
  - `Send to LLM`
- Disable `Send to LLM` until required settings are present.
- Display validation, extraction, analysis results, and error states.

Suggested states:

- Unsupported page
- Ready
- Extracting
- Export complete
- Analyzing
- Analysis success
- Analysis failed

### 2.3 Options page

Responsibilities:

- Capture and store provider settings.
- Validate that required fields exist before analysis is attempted.

Suggested settings:

- Provider selected from a fixed list of known LLM APIs
- API key

These settings are stored locally in extension storage.

### 2.4 Background service worker

Responsibilities:

- Receive normalized JSON for analysis.
- Load settings from extension storage.
- Build provider-specific request payloads.
- Send HTTPS requests to the selected LLM API.
- Normalize provider responses into a common analysis result format.

This keeps secrets and external communication out of the content script.

## 3. Data Model

### 3.1 Extracted document

```ts
type RedditThreadDocument = {
  source: "reddit";
  capturedAt: string;
  post: RedditPost;
  comments: RedditComment[];
};

type RedditPost = {
  id: string | null;
  url: string;
  subreddit: string | null;
  title: string;
  author: string | null;
};

type RedditComment = {
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
```

### 3.2 Analysis result

```ts
type AnalysisResult = {
  summary: string;
  overallSentiment: "positive" | "negative" | "mixed" | "neutral";
  themes: string[];
  notableDisagreements: string[];
  rawResponse?: unknown;
};
```

## 4. Data Flow

### 4.1 Export flow

1. User opens extension popup on a page.
2. User clicks `Summarize`.
3. Popup requests validation from the active tab content script.
4. Content script checks the Reddit post URL.
5. Content script checks the expected DOM structure.
6. If validation succeeds, content script returns a `RedditThreadDocument`.
7. Popup presents `Save JSON` and `Send to LLM`.
8. If the user selects `Save JSON`, popup serializes the document with indentation.
9. Popup triggers browser download for the JSON file.

### 4.2 Analysis flow

1. User opens extension popup.
2. User clicks `Summarize`.
3. Popup requests validation and extraction from the content script.
4. Content script validates the Reddit URL first, then validates the DOM structure.
5. If validation or extraction fails, popup shows a user-friendly error.
6. If extraction succeeds, popup checks whether provider settings are complete.
7. If settings are complete, popup enables `Send to LLM`.
8. When the user selects `Send to LLM`, popup sends the extracted document to the background service worker.
9. Background worker loads provider settings from extension storage.
10. Background worker prepares a prompt and API request body.
11. Background worker sends the request to the provider.
12. Background worker normalizes the result into `AnalysisResult`.
13. Popup displays the result.

## 5. DOM Extraction Strategy

The extractor should:

- Target stable selectors first, avoiding brittle class names when possible.
- Read visible comment containers and build a tree using nesting indicators or parent-child DOM structure.
- Normalize whitespace and strip UI-only text where needed.
- Capture only analysis-relevant text and metadata.
- Run only after explicit user action from the popup.

Fallback strategy:

- If complete hierarchy reconstruction is unreliable, keep a flat list with depth and parent IDs where available.
- Mark missing identifiers as `null` instead of inventing values.

## 6. Prompting Strategy

The initial analysis prompt should ask the LLM to return structured JSON with:

- Summary
- Overall sentiment
- Top themes
- Major disagreements

Reasoning:

- Structured output is easier to validate than free-form prose.
- A normalized result contract simplifies UI rendering and provider switching.

## 7. Security Considerations

- Store API keys only in extension storage.
- Store provider selection only in extension storage.
- Never expose keys to the page context.
- Limit host permissions to Reddit and the chosen provider domains where feasible.
- Validate provider responses before rendering.
- Avoid sending more user data than necessary.

## 8. Scaling Considerations

Large Reddit threads may exceed request budgets. The design should support:

- Maximum comment count caps
- Character or token budget trimming
- Optional summarization pre-pass in future versions
- User-visible warnings when the thread is truncated before analysis

## 9. Testing Strategy

### Unit tests

- DOM normalization helpers
- JSON schema generation
- Provider request builder
- Provider response parser

### Integration tests

- Extraction on representative Reddit post fixtures
- Export flow
- Settings persistence
- Analysis success and failure flows

### Manual validation

- Small thread
- Deeply nested thread
- Thread with deleted comments
- Thread with collapsed or partially loaded comments

## 10. Open Implementation Decisions

- Framework choice for popup and options UI
- Whether to support multiple LLM providers in v1 or start with one
- Whether extraction should rely only on DOM parsing or also inspect Reddit page data blobs when available
- Exact truncation strategy for very large threads
