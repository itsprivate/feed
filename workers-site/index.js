import { getAssetFromKV,mapRequestToAsset, NotFoundError, MethodNotAllowedError } from '@cloudflare/kv-asset-handler'
import manifestJSON from '__STATIC_CONTENT_MANIFEST'
const assetManifest = JSON.parse(manifestJSON)

export default {
  async fetch(request, env, ctx) {
      try {
        return await getAssetFromKV(
          {
            request,
            waitUntil(promise) {
              return ctx.waitUntil(promise)
            },
          },
          {
            ASSET_NAMESPACE: env.__STATIC_CONTENT,
            ASSET_MANIFEST: assetManifest,
            mapRequestToAsset: customKeyModifier 
          },
        )
      } catch (e) {
        if (e instanceof NotFoundError) {
          // ...
          return new Response('Not Found', { status: 404 })
        } else if (e instanceof MethodNotAllowedError) {
          // ...
          return new Response('Method Not Allowed', {
            status: 405,
            headers: {
              Allow: 'GET, HEAD',
            },
          })
        } else {
          return new Response('An unexpected error occurred', { status: 500 })
        }
      }
  },
}

function getSubsiteIdentifier(url) {
	const urlObj = new URL(url);
	return urlObj.hostname.split('.')[0];
}
const customKeyModifier = request => {
  const url = request.url
  //custom key mapping optional
  let subsiteIdentifier = getSubsiteIdentifier(url);
  if(subsiteIdentifier.startsWith('dev-')){
    subsiteIdentifier = subsiteIdentifier.slice(4);
  }
  const urlObj = new URL(url);
  urlObj.pathname = "/"+subsiteIdentifier+urlObj.pathname;
  return mapRequestToAsset(new Request(urlObj.href, request))
}