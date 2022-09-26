import { contentType, dotenvConfig, fs, path } from "../deps.ts";
import {
  getArchivedBucketName,
  getArchivePath,
  getArchiveS3Bucket,
  getDufsClient,
  isDev,
  uploadFileToDufs,
} from "../util.ts";
import log from "../log.ts";
import { DEV_MODE_HANDLED_ITEMS } from "../constant.ts";
export default async function uploadArchive() {
  const AWS_BUCKET = getArchivedBucketName();
  const s3Bucket = await getArchiveS3Bucket(AWS_BUCKET);
  const client = getDufsClient();
  // walk current folder
  await fs.ensureDir(getArchivePath());
  let total = 0;
  for await (const entry of fs.walk(getArchivePath())) {
    if (entry.isFile && entry.path.endsWith(".json")) {
      // Set the parameters for the object to upload.
      if (isDev()) {
        if (total > DEV_MODE_HANDLED_ITEMS) {
          break;
        }
      }
      if (Deno.env.get("ONLY_S3") !== "1") {
        await uploadFileToDufs(client, entry.path);
        log.info(`Uploaded ${entry.path} to dufs successfully`);
      }
      total++;
      if (total % 100 === 0 && total > 0) {
        log.info(`uploaded ${total} archived files`);
      }
      if (Deno.env.get("ONLY_DUFS") === "1" || true) {
        continue;
      }
      const ext = path.extname(entry.path);
      const contentTypeString = contentType(ext);
      await s3Bucket.putObject(entry.path, await Deno.readFile(entry.path), {
        contentType: contentTypeString,
      });
      log.info(`Uploaded ${entry.path} to ${AWS_BUCKET} successfully`);

      // remove file
      // await Deno.remove(entry.path);
    }
  }
  log.info(
    `finish upload archive data ${total} files to ${AWS_BUCKET}`,
  );
}

if (import.meta.main) {
  // init dotenv
  await dotenvConfig({ export: true });

  await uploadArchive();
}
