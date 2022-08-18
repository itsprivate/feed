export default {
	async fetch(
		request,
		env,
		_ctx
	) {

    switch (request.method) {
      case 'GET':{
				let subsiteIdentifier = getSubsiteIdentifier(request.url);
				let bucketName = 'MY_BUCKET';
				if(subsiteIdentifier.startsWith('dev-')){
					subsiteIdentifier = subsiteIdentifier.slice(4);
					bucketName = 'MY_BUCKET_DEV';
				}

				const fileKey = subsiteIdentifier+"/"+urlToFilePath(request.url);
				const object = await env[bucketName].get(fileKey);
        if (object === null) {
          return new Response('File Not Found', { status: 404 });
        }

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);
        return new Response(object.body, {
          headers,
        });
			}
        
     
      default:
        {
					return new Response('Method Not Allowed', {
						status: 405,
						headers: {
							Allow: 'PUT, GET, DELETE',
						},
					});
				}
    }
	},
};

function getSubsiteIdentifier(url) {
	const urlObj = new URL(url);
	return urlObj.hostname.split('.')[0];
}

export const urlToFilePath = (url) => {
  const urlObj = new URL(url);
  const pathname = urlObj.pathname;

  let filepath = pathname;

  if (pathname === "/") {
    filepath = "index.html";
  } else {
    filepath = pathname.slice(1);
  }
  if (filepath.endsWith("/")) {
    filepath += "index.html";
  } else {
    // check is has extension
    const basename = getBasename(filepath);
    if (!basename.includes(".")) {
      if (filepath.endsWith("/")) {
        filepath += "index.html";
      } else {
        filepath += "/index.html";
      }
    }
  }

  return filepath;
};

function getBasename(path) {
	return path.split('/').reverse()[0];
}