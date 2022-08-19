import { fs, GetObjectCommand, ListObjectsV2Command, path } from "../deps.ts";
import {
  getCurrentBucketName,
  getCurrentDataS3Client,
  getDataPath,
} from "../util.ts";
import { RunOptions } from "../interface.ts";
import log from "../log.ts";
export default async function loadCurrentData(_options: RunOptions) {
  const R2_BUCKET = getCurrentBucketName();
  log.info(`start load current data from ${R2_BUCKET}`);
  const s3Client = await getCurrentDataS3Client();
  const objects = await s3Client.send(
    new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      Prefix: getDataPath() + "/",
    }),
  );
  if (objects.Contents && Array.isArray(objects.Contents)) {
    // check is over 1000
    if (objects.Contents.length >= 1000) {
      throw new Error("too many objects in bucket, please take care");
    }
    // download all objects
    for (const object of objects.Contents) {
      if (object.Key) {
        console.log("object.Key", object.Key);
        const objectData = await s3Client.send(
          new GetObjectCommand({
            Bucket: R2_BUCKET,
            Key: object.Key,
          }),
        );
        if (objectData.Body) {
          const filePath = path.join(getDataPath(), object.Key);
          await fs.ensureFile(filePath);
          const file = await Deno.open(filePath, {
            write: true,
            create: true,
          });

          const body = objectData.Body as ReadableStream;
          await body.pipeTo(file.writable);
        }
      }
    }
    log.info(
      `load current data ${objects.Contents.length} files from ${R2_BUCKET} success`,
    );
  }
}
