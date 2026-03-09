import type { ExtractResponse, AnalyzeResponse } from "../shared/messages";
import type { RedditThreadDocument, RedditComment, AnalysisResult } from "../shared/types";
import { loadSettings, hasRequiredSettings } from "../shared/storage";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

type AppState =
  | { phase: "idle" }
  | { phase: "extracting" }
  | { phase: "extracted"; doc: RedditThreadDocument; hasSettings: boolean }
  | { phase: "analyzing"; doc: RedditThreadDocument }
  | { phase: "done"; doc: RedditThreadDocument; result: AnalysisResult }
  | { phase: "error"; error: string };

let state: AppState = { phase: "idle" };

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------

const statusMsg = document.getElementById("status-msg") as HTMLDivElement;
const sectionActions = document.getElementById("section-actions") as HTMLElement;
const sectionResult = document.getElementById("section-result") as HTMLElement;
const btnSummarize = document.getElementById("btn-summarize") as HTMLButtonElement;
const btnSaveJson = document.getElementById("btn-save-json") as HTMLButtonElement;
const btnSendLlm = document.getElementById("btn-send-llm") as HTMLButtonElement;
const openOptionsBtn = document.getElementById("open-options") as HTMLButtonElement;
const resultSentiment = document.getElementById("result-sentiment") as HTMLDivElement;
const resultSummary = document.getElementById("result-summary") as HTMLParagraphElement;
const resultThemes = document.getElementById("result-themes") as HTMLUListElement;
const resultDisagreementsSection = document.getElementById("result-disagreements-section") as HTMLDivElement;
const resultDisagreements = document.getElementById("result-disagreements") as HTMLUListElement;

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function render(): void {
  // Reset shared state
  hideStatus();
  sectionActions.classList.add("hidden");
  sectionResult.classList.add("hidden");
  btnSummarize.disabled = false;
  btnSaveJson.disabled = false;
  btnSendLlm.disabled = false;
  btnSendLlm.title = "";

  switch (state.phase) {
    case "idle":
      break;

    case "extracting":
      showStatus("Extracting comments…", "loading");
      btnSummarize.disabled = true;
      break;

    case "extracted": {
      const count = countComments(state.doc.comments);
      showStatus(`Extracted ${count} comment${count !== 1 ? "s" : ""}.`, "success");
      sectionActions.classList.remove("hidden");
      if (!state.hasSettings) {
        btnSendLlm.disabled = true;
        btnSendLlm.title = "Open settings to configure your API key first.";
      }
      break;
    }

    case "analyzing":
      showStatus("Analyzing with LLM…", "loading");
      sectionActions.classList.remove("hidden");
      btnSummarize.disabled = true;
      btnSendLlm.disabled = true;
      break;

    case "done":
      sectionActions.classList.remove("hidden");
      renderResult(state.result);
      sectionResult.classList.remove("hidden");
      break;

    case "error":
      showStatus(state.error, "error");
      break;
  }
}

function showStatus(msg: string, type: "loading" | "error" | "success"): void {
  statusMsg.textContent = msg;
  statusMsg.className = `status ${type}`;
}

function hideStatus(): void {
  statusMsg.textContent = "";
  statusMsg.className = "status hidden";
}

function renderResult(result: AnalysisResult): void {
  resultSentiment.textContent = result.overallSentiment;
  resultSentiment.className = `sentiment-badge sentiment-${result.overallSentiment}`;

  resultSummary.textContent = result.summary;

  resultThemes.innerHTML = "";
  for (const theme of result.themes) {
    const li = document.createElement("li");
    li.textContent = theme;
    resultThemes.appendChild(li);
  }

  if (result.notableDisagreements.length > 0) {
    resultDisagreementsSection.classList.remove("hidden");
    resultDisagreements.innerHTML = "";
    for (const d of result.notableDisagreements) {
      const li = document.createElement("li");
      li.textContent = d;
      resultDisagreements.appendChild(li);
    }
  } else {
    resultDisagreementsSection.classList.add("hidden");
  }
}

function countComments(comments: RedditComment[]): number {
  let n = 0;
  for (const c of comments) {
    n++;
    n += countComments(c.replies);
  }
  return n;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

async function handleSummarize(): Promise<void> {
  state = { phase: "extracting" };
  render();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    state = { phase: "error", error: "No active tab found." };
    render();
    return;
  }

  let response: ExtractResponse;
  try {
    response = (await chrome.tabs.sendMessage(tab.id, {
      type: "EXTRACT",
    })) as ExtractResponse;
  } catch {
    state = {
      phase: "error",
      error:
        "Could not reach the page script. Make sure you are on a Reddit post page and reload the tab if needed.",
    };
    render();
    return;
  }

  if (!response?.success) {
    state = { phase: "error", error: response?.error ?? "Extraction failed." };
    render();
    return;
  }

  const settings = await loadSettings();
  state = {
    phase: "extracted",
    doc: response.document,
    hasSettings: hasRequiredSettings(settings),
  };
  render();
}

function handleSaveJson(): void {
  const doc = getDoc();
  if (!doc) return;

  const json = JSON.stringify(doc, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const blobUrl = URL.createObjectURL(blob);
  const postId = doc.post.id ?? "export";
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = `reddit-${postId}-${ts}.json`;
  a.click();
  URL.revokeObjectURL(blobUrl);
}

async function handleSendToLlm(): Promise<void> {
  const doc = getDoc();
  if (!doc) return;

  state = { phase: "analyzing", doc };
  render();

  let response: AnalyzeResponse;
  try {
    response = (await chrome.runtime.sendMessage({
      type: "ANALYZE",
      document: doc,
    })) as AnalyzeResponse;
  } catch (err) {
    state = {
      phase: "error",
      error: `Analysis request failed: ${err instanceof Error ? err.message : String(err)}`,
    };
    render();
    return;
  }

  if (!response?.success) {
    state = { phase: "error", error: response?.error ?? "Analysis failed." };
    render();
    return;
  }

  state = { phase: "done", doc, result: response.result };
  render();
}

function getDoc(): RedditThreadDocument | null {
  if (
    state.phase === "extracted" ||
    state.phase === "analyzing" ||
    state.phase === "done"
  ) {
    return state.doc;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------

btnSummarize.addEventListener("click", () => {
  handleSummarize().catch(console.error);
});

btnSaveJson.addEventListener("click", handleSaveJson);

btnSendLlm.addEventListener("click", () => {
  handleSendToLlm().catch(console.error);
});

openOptionsBtn.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

// Boot
render();
