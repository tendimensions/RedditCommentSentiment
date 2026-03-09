# Reddit Comment Sentiment Extension

Browser extension project for extracting comments from a standard Reddit post page, exporting them as structured JSON, and optionally sending that JSON to an LLM for summary and sentiment analysis.

## Goals

- Let the user click the extension and run a `Summarize` action on demand.
- Validate the current page before extraction by checking the Reddit URL and expected DOM structure.
- Extract the visible comment tree into a stable JSON structure.
- Let the user export the extracted data as a `.json` file.
- Let the user send the extracted data to an LLM using a user-provided API key.
- Return an analysis response that includes:
  - Comment summary
  - Overall sentiment
  - Notable themes or disagreements

## Planned Features

### Comment extraction

- Start only when the user clicks the extension and requests summarization.
- Check that the active tab is a supported Reddit post URL.
- Check that the expected Reddit post/comment DOM structure is present.
- Show a user-friendly error if the URL or DOM validation fails.
- Parse post metadata and comment metadata from the Reddit page DOM.
- Preserve parent/child relationships in the exported structure.
- Capture enough context for downstream analysis without copying unnecessary UI content.

### Export

- After extraction, provide a `Save JSON` action.
- Human-readable pretty-printed output.

### LLM analysis

- After extraction, provide a `Send to LLM` action.
- Extension settings page for API provider selection and API key configuration.
- Disable `Send to LLM` until required settings have been saved locally.
- Render the returned summary and sentiment in the extension popup or result panel.

## High-Level Architecture

- `content script`
  - Runs on Reddit post pages.
  - Validates the page structure when the user triggers summarization.
  - Extracts post and comment data from the DOM.
  - Sends normalized JSON to the extension runtime.
- `background/service worker`
  - Handles provider API calls.
  - Reads stored settings such as API key, provider, and model.
  - Returns analysis results to the popup or content script.
- `popup UI`
  - Shows a `Summarize` action.
  - After successful extraction, shows:
    - Save JSON
    - Send to LLM
  - Disables `Send to LLM` when settings are incomplete.
  - Displays validation, extraction, and analysis status and user-friendly errors.
- `options page`
  - Stores a selected provider from a known list and an API key using extension storage.

## Initial JSON Shape

```json
{
  "source": "reddit",
  "capturedAt": "2026-03-09T00:00:00Z",
  "post": {
    "id": "post_id",
    "url": "https://www.reddit.com/r/example/comments/abc123/post_title/",
    "subreddit": "example",
    "title": "Post title",
    "author": "post_author"
  },
  "comments": [
    {
      "id": "comment_1",
      "author": "user_a",
      "body": "Top level comment text",
      "score": 120,
      "createdUtc": "2026-03-09T00:00:00Z",
      "depth": 0,
      "parentId": null,
      "permalink": "/r/example/comments/abc123/post_title/comment_1/",
      "replies": [
        {
          "id": "comment_2",
          "author": "user_b",
          "body": "Reply text",
          "score": 12,
          "createdUtc": "2026-03-09T00:10:00Z",
          "depth": 1,
          "parentId": "comment_1",
          "permalink": "/r/example/comments/abc123/post_title/comment_2/",
          "replies": []
        }
      ]
    }
  ]
}
```

## Suggested Tech Stack

- Manifest V3
- TypeScript
- Chromium-first browser extension target
- `chrome.storage` or `browser.storage` abstraction
- Fetch-based provider client in the background worker

## Development Phases

1. Build manual `Summarize` trigger flow.
2. Validate Reddit URL and expected DOM structure.
3. Normalize extracted data into a documented JSON schema.
4. Add post-extraction actions for `Save JSON` and `Send to LLM`.
5. Add settings page for provider selection and API key storage.
6. Add background LLM request flow, result rendering, validation, and error handling.

## Risks and Constraints

- Reddit DOM structure can change without notice.
- Infinite scrolling or collapsed comments may hide data from the extractor.
- Large threads may exceed provider token or payload limits.
- API keys must never be exposed to page JavaScript.
- Analysis quality depends on extraction quality and prompt design.

## Repository Purpose

This repository currently contains the planning documents needed to begin implementation:

- `README.md`
- `REQUIREMENTS.md`
- `DESIGN.md`
