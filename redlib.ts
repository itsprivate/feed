import log from "./log.ts";

/**
 * Convert a Reddit source URL to a Redlib instance URL.
 *
 * Examples:
 *   https://www.reddit.com/r/china/top/.json?raw_json=1
 *     => https://redlib.example.com/r/china/top?t=day
 *   https://www.reddit.com/r/linux/new/.json?raw_json=1
 *     => https://redlib.example.com/r/linux/new
 */
export function redditUrlToRedlib(
  redditUrl: string,
  redlibBase: string,
): string {
  const urlObj = new URL(redditUrl);
  // Remove .json from path: /r/china/top/.json -> /r/china/top/
  let pathname = urlObj.pathname.replace(/\.json$/, "");
  // Remove trailing slash
  pathname = pathname.replace(/\/$/, "");
  // Build Redlib URL
  let redlibUrl = `${redlibBase}${pathname}`;
  // For /top endpoints, add ?t=day to get daily top posts
  if (pathname.endsWith("/top")) {
    redlibUrl += "?t=day";
  }
  return redlibUrl;
}

interface ParsedRedlibPost {
  id: string;
  title: string;
  permalink: string;
  score: number;
  num_comments: number;
  author: string;
  subreddit: string;
  created_utc: number;
  url: string;
  over_18: boolean;
  thumbnail: string | null;
}

/**
 * Parse Redlib HTML page and extract post data.
 */
function parseRedlibHTML(html: string): ParsedRedlibPost[] {
  const posts: ParsedRedlibPost[] = [];
  const parts = html.split('<div class="post" ');

  // Skip first part (page header before first post)
  for (let i = 1; i < parts.length; i++) {
    const chunk = parts[i].substring(0, 3000);

    const idMatch = chunk.match(/id="([^"]+)"/);
    const titleMatch = chunk.match(
      /<a href="(\/r\/[^"]+\/comments\/[^"]+)">([^<]+)<\/a>/,
    );
    const scoreMatch = chunk.match(
      /<div class="post_score" title="([^"]*)">/,
    );
    const commentsMatch = chunk.match(
      /class="post_comments"[^>]*>(\d+)\s*comment/,
    );
    const authorMatch = chunk.match(
      /class="post_author[^"]*" href="\/u\/([^"]+)"/,
    );
    const subredditMatch = chunk.match(
      /class="post_subreddit" href="\/r\/([^"]+)"/,
    );
    const createdMatch = chunk.match(/class="created" title="([^"]+)"/);
    const externalUrlMatch = chunk.match(
      /<a class="post_thumbnail no_thumbnail" href="(https?:\/\/[^"]+)"/,
    );
    const imageMatch = chunk.match(
      /<a class="post_thumbnail"[^>]*>\s*<img[^>]*src="([^"]+)"/,
    );
    const nsfwMatch = chunk.match(/class="nsfw"/);

    if (!idMatch || !titleMatch) continue;

    const id = idMatch[1];
    const permalink = titleMatch[1];
    // Ensure permalink ends with /
    const normalizedPermalink = permalink.endsWith("/")
      ? permalink
      : permalink + "/";

    let title = titleMatch[2];
    // Decode HTML entities
    title = decodeHTMLEntities(title);

    // Parse score - handle "•" (hidden) as 0
    let score = 0;
    if (scoreMatch && scoreMatch[1] && scoreMatch[1] !== "•") {
      score = parseInt(scoreMatch[1], 10) || 0;
    }

    const numComments = commentsMatch ? parseInt(commentsMatch[1], 10) || 0 : 0;
    const author = authorMatch ? authorMatch[1] : "[deleted]";
    const subreddit = subredditMatch ? subredditMatch[1] : "";

    // Parse created timestamp: "Feb 06 2026, 01:55:30 UTC"
    let createdUtc = 0;
    if (createdMatch) {
      const d = new Date(createdMatch[1].replace(" UTC", " GMT"));
      if (!isNaN(d.getTime())) {
        createdUtc = d.getTime() / 1000;
      }
    }

    // Determine URL: external link or Reddit permalink
    let url: string;
    if (externalUrlMatch) {
      url = externalUrlMatch[1];
    } else {
      url = `https://old.reddit.com${normalizedPermalink}`;
    }

    const thumbnail = imageMatch ? imageMatch[1] : null;
    const over18 = !!nsfwMatch;

    posts.push({
      id,
      title,
      permalink: normalizedPermalink,
      score,
      num_comments: numComments,
      author,
      subreddit,
      created_utc: createdUtc,
      url,
      over_18: over18,
      thumbnail,
    });
  }

  return posts;
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#34;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#32;/g, " ");
}

/**
 * Convert parsed Redlib posts to Reddit JSON API format.
 * Returns the same structure as Reddit's /r/subreddit/top/.json response,
 * so the existing reddit adapter can process it unchanged.
 */
function toRedditJsonFormat(
  posts: ParsedRedlibPost[],
): { data: { children: Array<{ kind: string; data: Record<string, unknown> }> } } {
  return {
    data: {
      children: posts.map((post) => ({
        kind: "t3",
        data: {
          id: post.id,
          title: post.title,
          permalink: post.permalink,
          score: post.score,
          num_comments: post.num_comments,
          author: post.author,
          subreddit: post.subreddit,
          created: post.created_utc,
          created_utc: post.created_utc,
          url: post.url,
          over_18: post.over_18,
          // Fields the adapter accesses but we can't get from HTML
          preview: null,
          media: null,
          is_self: !post.url.startsWith("http") ||
            post.url.includes("reddit.com/r/"),
        },
      })),
    },
  };
}

/**
 * Fetch Reddit data from a Redlib instance.
 * Converts a Reddit source URL to Redlib URL, fetches HTML,
 * parses it, and returns data in Reddit JSON API format.
 */
export async function fetchFromRedlib(
  redditUrl: string,
  redlibBase: string,
): Promise<{ data: { children: Array<{ kind: string; data: Record<string, unknown> }> } }> {
  const redlibUrl = redditUrlToRedlib(redditUrl, redlibBase);
  log.info(`Fetching from Redlib: ${redlibUrl}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  const response = await fetch(redlibUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Accept": "text/html",
    },
    signal: controller.signal,
  });
  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(
      `Redlib request failed: ${redlibUrl}, ${response.status}`,
    );
  }

  const html = await response.text();
  const posts = parseRedlibHTML(html);
  log.info(`Parsed ${posts.length} posts from Redlib`);

  return toRedditJsonFormat(posts);
}
