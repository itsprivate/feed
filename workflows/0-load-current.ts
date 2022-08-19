import {
  getCurrentBucketName,
  getCurrentDataS3Bucket,
  getDataPath,
  writeTextFile,
} from "../util.ts";
import { RunOptions } from "../interface.ts";
import log from "../log.ts";
export default async function loadCurrentData(_options: RunOptions) {
  const R2_BUCKET = getCurrentBucketName();
  log.info(`start load current data from ${R2_BUCKET}`);
  const s3Bucket = getCurrentDataS3Bucket(R2_BUCKET);
  const objects = await s3Bucket.listObjects({
    prefix: getDataPath() + "/",
  });

  if (objects && objects.contents && Array.isArray(objects.contents)) {
    // check is over 1000
    if (objects.contents.length >= 1000) {
      throw new Error("too many objects in bucket, please take care");
    }
    // download all objects
    for (const object of objects.contents) {
      if (object.key) {
        console.log("object.Key", object.key);
        const objectData = await s3Bucket.getObject(object.key);
        if (objectData) {
          const { body } = objectData;
          const data = await new Response(body).text();
          await writeTextFile(object.key, data);
        }
      }
    }
    log.info(
      `load current data ${objects.contents.length} files from ${R2_BUCKET} success`,
    );
  }
}
