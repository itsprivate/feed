import { request } from "../util.ts";
import log from "../log.ts";
export default async function fetchPHData() {
  const myHeaders = new Headers();
  const phToken = Deno.env.get("PRODUCTHUNT_TOKEN");
  if (!phToken) {
    throw new Error("PRODUCTHUNT_TOKEN is not set");
  }
  myHeaders.append(
    "Authorization",
    `Bearer ${phToken}`,
  );
  myHeaders.append("Content-Type", "application/json");
  const now = Date.now();
  const last24 = now - 72 * 60 * 60 * 1000;
  const after = new Date(last24).toISOString();
  const graphql = JSON.stringify({
    query: `query($after:DateTime) {
      posts (order:VOTES,postedAfter:$after){
        edges{
          node {
            id
            commentsCount
            createdAt
            description
            featuredAt
            media {
              type
              url
              videoUrl
            }
            name
            productLinks {
              type
              url
            }
            user {
              name
              url
            }
            reviewsCount
            reviewsRating
            slug
            tagline
            url
            votesCount
            website
            topics {
              edges {
                node {
                  name
                }
              }
            }
            
          }
        }
      }
    }`,
    variables: {
      after,
    },
  });
  const originalJson = await request(
    "https://api.producthunt.com/v2/api/graphql",
    {
      method: "POST",
      headers: myHeaders,
      body: graphql,
      redirect: "follow",
    },
  )
    .then((response) => response.json()).then((json) => {
      if (json.errors && json.errors.length > 0) {
        log.error(json.errors);
        throw new Error(json.errors[0].error_description);
      } else {
        return json;
      }
    });
  return originalJson;
}
