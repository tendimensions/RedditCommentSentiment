import type { ExtractMessage, ExtractResponse } from "../shared/messages";
import { validateUrl, validateDom } from "./validator";
import { extractDocument } from "./extractor";

chrome.runtime.onMessage.addListener(
  (
    message: ExtractMessage,
    _sender,
    sendResponse: (r: ExtractResponse) => void
  ) => {
    if (message.type !== "EXTRACT") return false;

    const urlResult = validateUrl(window.location.href);
    if (!urlResult.valid) {
      sendResponse({ success: false, error: urlResult.reason });
      return false;
    }

    const domResult = validateDom();
    if (!domResult.valid) {
      sendResponse({ success: false, error: domResult.reason });
      return false;
    }

    try {
      const doc = extractDocument();
      sendResponse({ success: true, document: doc });
    } catch (err) {
      sendResponse({
        success: false,
        error: `Extraction failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }

    return false;
  }
);
