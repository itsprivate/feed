/**
 * @deprecated
 */
import {
  getCurrentBucketName,
  getCurrentDataS3Bucket,
  getDataPath,
  writeTextFile,
} from "../util.ts";
import { RunOptions } from "../interface.ts";
import log from "../log.ts";
import { dotenvConfig } from "../deps.ts";

export default async function loadCurrentData(_options?: RunOptions) {
  const AWS_BUCKET = getCurrentBucketName();
  log.info(`start load current data from ${AWS_BUCKET}`);
  const s3Bucket = getCurrentDataS3Bucket(AWS_BUCKET);
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
        const objectData = await s3Bucket.getObject(object.key);
        if (objectData) {
          const { body } = objectData;
          const data = await new Response(body).text();
          await writeTextFile(object.key, data);
          log.info(`downloaded ${object.key}`);
        }
      }
    }
    log.info(
      `load current data ${objects.contents.length} files from ${AWS_BUCKET} success`,
    );
  }
}

if (import.meta.main) {
  await dotenvConfig({ export: true });
  loadCurrentData();
}
