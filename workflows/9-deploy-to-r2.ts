import {
  contentType,
  dotenvConfig,
  fs,
  path,
  PutObjectCommand,
  S3Client,
} from "../deps.ts";
import {
  getDistPath,
  isDev,
  pathToSiteIdentifier,
  siteIdentifierToPath,
} from "../util.ts";
import { RunOptions } from "../interface.ts";
import log from "../log.ts";
export default async function deployToR2(options: RunOptions) {
  const env = await dotenvConfig();
  const R2_ACCESS_KEY_ID = env.R2_ACCESS_KEY_ID;
  const R2_SECRET_ACCESS_KEY = env.R2_SECRET_ACCESS_KEY;
  const CLOUDFLARE_ACCOUNT_ID = env.CLOUDFLARE_ACCOUNT_ID;
  const R2_BUCKET = isDev() ? "feed-dev" : "feed";
  const s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  // walk dist folder
  await fs.ensureDir(getDistPath());

  let siteIdentifiers: string[] = [];

  for await (const dirEntry of Deno.readDir(getDistPath())) {
    if (dirEntry.isDirectory && !dirEntry.name.startsWith(".")) {
      siteIdentifiers.push(pathToSiteIdentifier(dirEntry.name));
    }
  }
  const sites = options.siteIdentifiers;
  if (sites && Array.isArray(sites)) {
    siteIdentifiers = siteIdentifiers.filter((siteIdentifier) => {
      return (sites as string[]).includes(siteIdentifier);
    });
  }
  if (siteIdentifiers.length > 0) {
    for (const siteIdentifier of siteIdentifiers) {
      const files: string[] = [];
      try {
        for await (
          const entry of fs.walk(
            getDistPath() + "/" + siteIdentifierToPath(siteIdentifier),
          )
        ) {
          if (entry.isFile) {
            files.push(entry.path);
          }
        }
      } catch (e) {
        throw e;
      }
      if (files.length > 0) {
        // upload files
        const promises = [];
        for (const file of files) {
          // Set the parameters for the object to upload.
          const relativePath = path.relative(getDistPath(), file);
          const ext = path.extname(file);
          const contentTypeString = contentType(ext);
          const object_upload_params = {
            Bucket: R2_BUCKET,
            // Specify the name of the new object. For example, 'test.html'.
            // To create a directory for the object, use '/'. For example, 'myApp/package.json'.
            ContentType: contentTypeString,
            Key: relativePath,
            // Content of the new object.
            Body: await Deno.readTextFile(file),
          };
          // Create and upload the object to the first S3 bucket.
          promises.push(
            s3Client.send(new PutObjectCommand(object_upload_params)),
          );
        }

        await Promise.all(promises);
        log.info(`uploaded ${files.length} files to ${siteIdentifier}`);
      }
    }
  }
}
