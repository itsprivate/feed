import {
  getArchivedBucketName,
  getArchivePath,
  getArchiveS3Bucket,
} from "../util.ts";
import log from "../log.ts";
import { dotenvConfig } from "../deps.ts";
async function cleanRemoteCurrentData() {
  await dotenvConfig({
    export: true,
  });
  const bucket = getArchiveS3Bucket(getArchivedBucketName());
  const currentDataPath = getArchivePath();
  const list = await bucket.listObjects({
    prefix: currentDataPath + "/",
  });
  if (list && list.contents && list.contents.length > 0) {
    log.info(
      `There are ${list.contents.length} objects in ${getArchivedBucketName()} to delete, confirm?`,
    );
    const input = prompt("Please enter y to confirm");
    if (input && input.trim() === "y") {
      // again
      const input = prompt("Please enter again y to confirm!");
      if (input && input.trim() === "y") {
        for (const item of list.contents) {
          await bucket.deleteObject(item.key!);
          log.info(`Deleted ${item.key}`);
        }
      } else {
        log.info("canceled");
      }
      // await bucket.deleteObjects(list.contents.map((o) => o.key));
    } else {
      log.info("canceled");
    }
  } else {
    log.info("No current data to clean");
  }
}

cleanRemoteCurrentData();
