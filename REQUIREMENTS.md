# Requirements

## 1. Purpose

Build a browser extension that works on standard Reddit post pages and allows a user to:

1. Click the extension and request a summary of the current Reddit post comments.
2. Extract the page's comment thread into formatted JSON after validation succeeds.
3. Export that JSON locally.
4. Send that JSON to an LLM provider using a user-configured API key.
5. Receive a response containing a summary and sentiment analysis of the comments.

## 2. Functional Requirements

### 2.1 Page detection

- The extension shall begin extraction only when the user clicks the extension UI and selects `Summarize`.
- When `Summarize` is requested, the extension shall first verify that the active tab URL is a supported Reddit post URL.
- After URL validation succeeds, the extension shall verify that the expected Reddit post and comment DOM structure is present.
- If URL validation fails, the extension shall show a user-friendly error.
- If DOM validation fails, the extension shall show a user-friendly error.

### 2.2 Comment extraction

- The extension shall extract post metadata:
  - Post ID
  - Post URL
  - Subreddit
  - Post title
  - Post author when available
- The extension shall extract comment metadata for each captured comment:
  - Comment ID when available
  - Author name when available
  - Comment body text
  - Score when available
  - Timestamp when available
  - Depth
  - Parent comment ID when applicable
  - Permalink when available
- The extension shall preserve comment hierarchy.
- The extension shall omit deleted or unavailable fields only when they cannot be reliably read.
- The extension shall produce deterministic field names and a stable JSON structure.
- The extension shall only present post-extraction actions after successful JSON extraction.

### 2.3 Export

- The extension shall allow the user to save the extracted data as a JSON file after extraction succeeds.
- The exported JSON shall be pretty-printed.
- The exported filename should include a Reddit post identifier or timestamp.

### 2.4 LLM configuration

- The extension shall provide an options page or equivalent settings UI.
- The user shall be able to configure:
  - Provider name selected from a drop-down list of known LLM APIs
  - API key entered into a text field
- The extension shall store settings in extension-managed storage.
- The extension shall store settings locally for the extension to use later.
- The extension shall treat provider selection and API key as required fields for LLM submission.

### 2.5 LLM analysis

- The extension shall offer an LLM analysis action only after JSON extraction succeeds.
- The extension shall disable or hide the LLM analysis action when required settings are missing.
- The extension shall send extracted JSON to the configured LLM provider on user action.
- The extension shall request an analysis that includes:
  - Concise summary
  - Overall sentiment
  - Key themes
  - Notable disagreement or controversy if present
- The extension shall display the analysis response inside extension UI.
- The extension shall show loading, success, and failure states.

### 2.6 Error handling

- The extension shall report when extraction fails.
- The extension shall report when no comments are available.
- The extension shall report URL validation failures with a user-friendly message.
- The extension shall report DOM validation failures with a user-friendly message.
- The extension shall report API configuration errors.
- The extension shall report provider request failures and malformed responses.

## 3. Non-Functional Requirements

### 3.1 Security

- API keys shall not be injected into page JavaScript context.
- Provider requests shall be made from the extension background context.
- The extension shall request the minimum permissions needed.
- Sensitive settings shall only be stored in extension storage.

### 3.2 Performance

- Extraction should complete quickly for common Reddit threads.
- The extension should avoid blocking the page or freezing the popup UI.
- Large comment sets should be handled with chunking or truncation rules before LLM submission.

### 3.3 Reliability

- Extraction logic should degrade gracefully when optional Reddit fields are absent.
- The extension should remain functional if some comments cannot be parsed.
- The extension should log diagnostic information for development builds.

### 3.4 Maintainability

- Core logic should be separated into extraction, normalization, export, provider, and UI modules.
- JSON schema definitions should be centralized.
- Provider integration should allow swapping models or vendors later.

## 4. Assumptions

- Initial target is Chromium-based browsers.
- Initial supported site is the current standard Reddit web UI.
- The LLM provider exposes an HTTPS JSON API compatible with background fetch calls.
- Users understand they are responsible for their own provider account and API usage costs.

## 5. Out of Scope for Initial Version

- Support for old Reddit UI.
- Support for every Reddit layout experiment.
- Automatic batch processing across many posts.
- User account syncing across browsers.
- Fine-grained sentiment scoring per individual comment unless needed later.

## 6. Acceptance Criteria

- On a supported Reddit post page, the user can extract comments and export valid JSON.
- The exported JSON includes post metadata and a nested comment structure.
- After entering a valid API key and provider configuration, the user can request analysis.
- The extension displays a summary and sentiment response for the extracted comments.
- Invalid configuration and request failures produce clear error messages.
