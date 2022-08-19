import { contentType, fs, path } from "../deps.ts";
import {
  getCurrentBucketName,
  getCurrentDataS3Bucket,
  getDataPath,
} from "../util.ts";
import { RunOptions } from "../interface.ts";
import log from "../log.ts";
export default async function uploadCurrentData(_options: RunOptions) {
  const R2_BUCKET = getCurrentBucketName();
  log.info(`start upload current data to ${R2_BUCKET}`);
  const s3Bucket = await getCurrentDataS3Bucket(R2_BUCKET);

  // walk current folder
  await fs.ensureDir(getDataPath());
  let total = 0;
  for await (const entry of fs.walk(getDataPath())) {
    if (entry.isFile) {
      // Set the parameters for the object to upload.
      const relativePath = entry.path;
      const ext = path.extname(entry.path);
      const contentTypeString = contentType(ext);
      // Create and upload the object to the first S3 bucket.
      await s3Bucket.putObject(relativePath, await Deno.readFile(entry.path), {
        contentType: contentTypeString,
      });
      total++;
    }
  }
  log.info(
    `finish upload current data ${total} files to ${R2_BUCKET}`,
  );
}
