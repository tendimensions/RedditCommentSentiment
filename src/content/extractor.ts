import type { RedditThreadDocument, RedditPost, RedditComment } from "../shared/types";

export function extractDocument(): RedditThreadDocument {
  return {
    source: "reddit",
    capturedAt: new Date().toISOString(),
    post: extractPost(),
    comments: extractComments(),
  };
}

// ---------------------------------------------------------------------------
// Post extraction
// ---------------------------------------------------------------------------

function extractPost(): RedditPost {
  const url = window.location.href.replace(/[?#].*$/, "");

  const shredditPost = document.querySelector("shreddit-post");
  if (shredditPost) {
    const rawId = shredditPost.getAttribute("id");
    // shreddit id is like "t3_abc123"; strip the prefix
    const id = rawId?.replace(/^t3_/, "") ?? parsePostIdFromUrl(url);

    const subreddit =
      shredditPost.getAttribute("subreddit-prefixed-name")?.replace(/^r\//, "") ??
      shredditPost.getAttribute("subreddit-name") ??
      parseSubredditFromUrl(url);

    const title =
      shredditPost.getAttribute("post-title") ??
      document.querySelector("h1")?.textContent?.trim() ??
      document.title;

    const author = shredditPost.getAttribute("author") ?? null;

    return { id, url, subreddit, title, author };
  }

  // Legacy / fallback
  return {
    id: parsePostIdFromUrl(url),
    url,
    subreddit: parseSubredditFromUrl(url),
    title:
      document.querySelector("h1")?.textContent?.trim() ??
      document.querySelector("[data-testid='post-title']")?.textContent?.trim() ??
      document.title,
    author:
      document.querySelector("[data-testid='post_author_link']")?.textContent?.trim() ??
      null,
  };
}

function parsePostIdFromUrl(url: string): string | null {
  const m = url.match(/\/comments\/([^/?#]+)/);
  return m ? m[1] : null;
}

function parseSubredditFromUrl(url: string): string | null {
  const m = url.match(/\/r\/([^/?#]+)/);
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// Comment extraction
// ---------------------------------------------------------------------------

function extractComments(): RedditComment[] {
  const shredditComments = document.querySelectorAll<HTMLElement>("shreddit-comment");
  if (shredditComments.length > 0) {
    return extractShredditComments(shredditComments);
  }
  return extractLegacyComments();
}

function extractShredditComments(
  elements: NodeListOf<HTMLElement>
): RedditComment[] {
  const flat: RedditComment[] = [];
  const byId = new Map<string, RedditComment>();

  for (const el of elements) {
    const rawId = el.getAttribute("thingid") ?? null;
    const id = rawId?.replace(/^t1_/, "") ?? null;

    const author = el.getAttribute("author") ?? null;

    const scoreRaw = el.getAttribute("score");
    const score = scoreRaw !== null ? parseInt(scoreRaw, 10) : null;

    const createdUtc = el.getAttribute("created-timestamp") ?? null;

    const depthRaw = el.getAttribute("depth");
    const depth = depthRaw !== null ? parseInt(depthRaw, 10) : 0;

    const permalink = el.getAttribute("permalink") ?? null;

    // parentid attribute may hold a t3_ (post) or t1_ (comment) value
    const rawParentId =
      el.getAttribute("parentid") ?? el.getAttribute("parent-id") ?? null;
    const parentId =
      rawParentId?.startsWith("t1_") ? rawParentId.slice(3) : null;

    const body = extractCommentBody(el);

    const comment: RedditComment = {
      id,
      author,
      body,
      score: score !== null && !isNaN(score) ? score : null,
      createdUtc,
      depth,
      parentId,
      permalink,
      replies: [],
    };

    flat.push(comment);
    if (id) byId.set(id, comment);
  }

  return buildTree(flat, byId);
}

function extractCommentBody(el: HTMLElement): string {
  // Try known shreddit selectors in priority order
  const selectors = [
    "[id^='comment-rtjson-content']",
    "[data-testid='comment']",
    ".md",
  ];

  for (const sel of selectors) {
    const bodyEl = el.querySelector(sel);
    if (bodyEl?.textContent?.trim()) {
      return bodyEl.textContent.trim();
    }
  }

  // Fall back to collecting paragraph text
  const paragraphs = Array.from(el.querySelectorAll("p"));
  const text = paragraphs
    .map((p) => p.textContent?.trim())
    .filter(Boolean)
    .join("\n\n");

  return text || el.textContent?.trim() || "";
}

function extractLegacyComments(): RedditComment[] {
  const containers = document.querySelectorAll<HTMLElement>(
    "[data-fullname^='t1_']"
  );
  const flat: RedditComment[] = [];
  const byId = new Map<string, RedditComment>();

  for (const container of containers) {
    const rawFullname = container.getAttribute("data-fullname") ?? null;
    const id = rawFullname?.replace(/^t1_/, "") ?? null;

    const author =
      container.getAttribute("data-author") ??
      container
        .querySelector("[data-testid='comment_author_link']")
        ?.textContent?.trim() ??
      null;

    const bodyEl = container.querySelector("[data-testid='comment']");
    const body = bodyEl?.textContent?.trim() ?? "";

    const depthRaw = container.getAttribute("data-depth");
    const depth = depthRaw !== null ? parseInt(depthRaw, 10) : 0;

    const rawParentId = container.getAttribute("data-parent-id") ?? null;
    const parentId = rawParentId?.startsWith("t1_") ? rawParentId.slice(3) : null;

    const permalink =
      (container.querySelector("a.bylink") as HTMLAnchorElement | null)?.getAttribute("href") ??
      null;

    const comment: RedditComment = {
      id,
      author,
      body,
      score: null,
      createdUtc: null,
      depth,
      parentId,
      permalink,
      replies: [],
    };

    flat.push(comment);
    if (id) byId.set(id, comment);
  }

  return buildTree(flat, byId);
}

function buildTree(
  flat: RedditComment[],
  byId: Map<string, RedditComment>
): RedditComment[] {
  const roots: RedditComment[] = [];

  for (const comment of flat) {
    if (comment.parentId && byId.has(comment.parentId)) {
      byId.get(comment.parentId)!.replies.push(comment);
    } else {
      roots.push(comment);
    }
  }

  return roots;
}
