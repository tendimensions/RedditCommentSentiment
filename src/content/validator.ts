export type ValidationResult =
  | { valid: true }
  | { valid: false; reason: string };

// Matches: https://www.reddit.com/r/<subreddit>/comments/<id>/...
const REDDIT_POST_PATTERN = /^https:\/\/www\.reddit\.com\/r\/[^/]+\/comments\/[^/]+/;

export function validateUrl(url: string): ValidationResult {
  if (!REDDIT_POST_PATTERN.test(url)) {
    return {
      valid: false,
      reason:
        "This page is not a supported Reddit post URL. Navigate to a Reddit post and try again.",
    };
  }
  return { valid: true };
}

export function validateDom(): ValidationResult {
  // New Reddit uses <shreddit-post> web component
  const hasShredditPost = document.querySelector("shreddit-post") !== null;
  // Fallback: old-style post container
  const hasLegacyPost =
    document.querySelector("[data-testid='post-container']") !== null;

  if (!hasShredditPost && !hasLegacyPost) {
    return {
      valid: false,
      reason:
        "Expected Reddit post structure not found on this page. The page may still be loading, or the layout may have changed.",
    };
  }
  return { valid: true };
}
