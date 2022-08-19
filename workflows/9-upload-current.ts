import { contentType, fs, path, PutObjectCommand } from "../deps.ts";
import {
  getCurrentBucketName,
  getCurrentDataS3Client,
  getDataPath,
} from "../util.ts";
import { RunOptions } from "../interface.ts";
import log from "../log.ts";
export default async function uploadCurrentData(_options: RunOptions) {
  const R2_BUCKET = getCurrentBucketName();
  log.info(`start upload current data to ${R2_BUCKET}`);
  const s3Client = await getCurrentDataS3Client();

  // walk current folder
  await fs.ensureDir(getDataPath());
  let total = 0;
  for await (const entry of fs.walk(getDataPath())) {
    if (entry.isFile) {
      // Set the parameters for the object to upload.
      const relativePath = entry.path;
      const ext = path.extname(entry.path);
      const contentTypeString = contentType(ext);
      const object_upload_params = {
        Bucket: R2_BUCKET,
        // Specify the name of the new object. For example, 'test.html'.
        // To create a directory for the object, use '/'. For example, 'myApp/package.json'.
        ContentType: contentTypeString,
        Key: relativePath,
        // Content of the new object.
        Body: await Deno.readTextFile(entry.path),
      };
      // Create and upload the object to the first S3 bucket.
      await s3Client.send(new PutObjectCommand(object_upload_params)), total++;
    }
  }
  log.info(
    `finish upload current data ${total} files to ${R2_BUCKET}`,
  );
}
