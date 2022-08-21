import { contentType, fs, path } from "../deps.ts";
import {
  getCurrentBucketName,
  getCurrentDataS3Bucket,
  getDistPath,
  pathToSiteIdentifier,
  siteIdentifierToPath,
} from "../util.ts";
import { RunOptions } from "../interface.ts";
import log from "../log.ts";
export default async function deployToR2(options: RunOptions) {
  const R2_BUCKET = getCurrentBucketName();
  const s3Bucket = await getCurrentDataS3Bucket(R2_BUCKET);

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
          if (entry.isFile && entry.path.endsWith(".json")) {
            files.push(entry.path);
          }
        }
      } catch (e) {
        throw e;
      }
      if (files.length > 0) {
        // upload files
        for (const file of files) {
          // Set the parameters for the object to upload.
          const relativePath = path.relative(getDistPath(), file);
          const ext = path.extname(file);
          const contentTypeString = contentType(ext);

          await s3Bucket.putObject(relativePath, await Deno.readFile(file), {
            contentType: contentTypeString,
          });
          log.info(`upload ${relativePath} to ${R2_BUCKET} success`);
        }

        log.info(`uploaded ${files.length} files to ${siteIdentifier}`);
      }
    }
  }
}
