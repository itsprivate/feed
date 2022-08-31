import { contentType, fs, path } from "../deps.ts";
import {
  getCurrentBucketName,
  getCurrentDataS3Bucket,
  getDistPath,
} from "../util.ts";
import log from "../log.ts";
export default async function uploadPublicToR2() {
  const AWS_BUCKET = getCurrentBucketName();
  const s3Bucket = await getCurrentDataS3Bucket(AWS_BUCKET);

  // walk dist folder
  await fs.ensureDir(getDistPath());

  const files: string[] = [];
  try {
    for await (
      const entry of fs.walk(
        getDistPath(),
      )
    ) {
      if (entry.isFile && !entry.path.startsWith(".")) {
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
      const ext = path.extname(file);
      const contentTypeString = contentType(ext);

      await s3Bucket.putObject(file, await Deno.readFile(file), {
        contentType: contentTypeString,
      });
      log.info(`upload ${file} to ${AWS_BUCKET} success`);
    }

    log.info(`uploaded ${files.length} files`);
  }
}

if (import.meta.main) {
  await uploadPublicToR2();
}
