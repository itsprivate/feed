import log from "./log.ts";

const REDDIT_USER_AGENT = "deno:buzzing-feed:v1.0 (by u/user)";

// OAuth token cache (for future use when API credentials are available)
const REDDIT_TOKEN_URL = "https://www.reddit.com/api/v1/access_token";
const TOKEN_REFRESH_MARGIN = 5 * 60 * 1000;
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

export function getRedditUserAgent(): string {
  return REDDIT_USER_AGENT;
}

export function hasRedditCredentials(): boolean {
  const clientId = Deno.env.get("REDDIT_CLIENT_ID");
  const clientSecret = Deno.env.get("REDDIT_CLIENT_SECRET");
  return !!clientId && !!clientSecret;
}

export async function getRedditAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - TOKEN_REFRESH_MARGIN) {
    return cachedToken;
  }

  const clientId = Deno.env.get("REDDIT_CLIENT_ID");
  const clientSecret = Deno.env.get("REDDIT_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error(
      "REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET must be set for Reddit API access",
    );
  }

  const credentials = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch(REDDIT_TOKEN_URL, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": REDDIT_USER_AGENT,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Reddit OAuth token request failed: ${response.status} ${text}`,
    );
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;

  log.info(
    `Reddit OAuth token obtained, expires in ${data.expires_in}s`,
  );

  return cachedToken!;
}

export function redditUrlToOAuth(url: string): string {
  return url.replace("https://www.reddit.com/", "https://oauth.reddit.com/");
}
