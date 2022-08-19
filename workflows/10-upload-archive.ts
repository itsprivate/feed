import { contentType, fs, path } from "../deps.ts";
import {
  getArchiveBucketName,
  getArchivePath,
  getArchiveS3Bucket,
} from "../util.ts";
import { RunOptions } from "../interface.ts";
import log from "../log.ts";
export default async function uploadCurrentData(_options: RunOptions) {
  const R2_BUCKET = getArchiveBucketName();
  const s3Bucket = await getArchiveS3Bucket(R2_BUCKET);

  // walk current folder
  await fs.ensureDir(getArchivePath());
  let total = 0;
  for await (const entry of fs.walk(getArchivePath())) {
    if (entry.isFile) {
      // Set the parameters for the object to upload.
      const ext = path.extname(entry.path);
      const contentTypeString = contentType(ext);
      await s3Bucket.putObject(entry.path, await Deno.readFile(entry.path), {
        contentType: contentTypeString,
      });
      total++;
    }
  }
  log.info(
    `finish upload archive data ${total} files to ${R2_BUCKET}`,
  );
}
