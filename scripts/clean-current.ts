import {
  getCurrentBucketName,
  getCurrentDataS3Bucket,
  getDataPath,
} from "../util.ts";
import log from "../log.ts";
async function cleanRemoteCurrentData() {
  const bucket = await getCurrentDataS3Bucket(getCurrentBucketName());
  const currentDataPath = getDataPath();
  const list = await bucket.listObjects({
    prefix: currentDataPath + "/",
  });
  if (list && list.contents && list.contents.length > 0) {
    log.info(
      `There are ${list.contents.length} objects in ${bucket} to delete, confirm?`,
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
