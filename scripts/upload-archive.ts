import { contentType, dotenvConfig, fs, path } from "../deps.ts";
import {
  getArchivedBucketName,
  getArchivePath,
  getArchiveS3Bucket,
} from "../util.ts";
import log from "../log.ts";
export default async function uploadArchive() {
  const R2_BUCKET = getArchivedBucketName();
  const s3Bucket = await getArchiveS3Bucket(R2_BUCKET);

  // walk current folder
  await fs.ensureDir(getArchivePath());
  let total = 0;
  for await (const entry of fs.walk(getArchivePath())) {
    if (entry.isFile && entry.path.endsWith(".json")) {
      // Set the parameters for the object to upload.
      const ext = path.extname(entry.path);
      const contentTypeString = contentType(ext);
      await s3Bucket.putObject(entry.path, await Deno.readFile(entry.path), {
        contentType: contentTypeString,
      });
      if (total % 100 === 0) {
        log.info(`uploaded ${total} archived files`);
      }
      // remove file
      await Deno.remove(entry.path);
      total++;
    }
  }
  log.info(
    `finish upload archive data ${total} files to ${R2_BUCKET}`,
  );
}

if (import.meta.main) {
  // init dotenv
  await dotenvConfig({ export: true });
  await uploadArchive();
}
