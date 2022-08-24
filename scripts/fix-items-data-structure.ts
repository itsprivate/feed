import { contentType, dotenvConfig, fs, path } from "../deps.ts";
import {
  getArchivedBucketName,
  getArchivePath,
  getArchiveS3Bucket,
  getDataPath,
  readJSONFile,
  writeJSONFile,
} from "../util.ts";
import log from "../log.ts";
export default async function uploadArchive() {
  // walk current folder
  const regex = /[^0-9]*(\d+?)[^0-9]+/;
  await fs.ensureDir(getArchivePath());

  await fs.ensureDir(getDataPath());
  let total = 0;
  let totalItems = 0;
  let totalFiles = 0;
  for await (const entry of fs.walk(getArchivePath())) {
    totalFiles++;
    if (
      entry.isFile &&
      (entry.name === "items.json" ||
        entry.name === "to-be-archived-items.json")
    ) {
      // Set the parameters for the object to upload.
      // TODO

      const itemsJson = await readJSONFile(entry.path);
      let isChanged = false;
      if (itemsJson.items && itemsJson.items) {
        // if (total > 1555) {
        //   break;
        // }
        const keys = Object.keys(itemsJson.items);

        if (keys.length > 0) {
          for (const key of keys) {
            const item = itemsJson.items[key];
            if (item._links && item._links.length > 0) {
              // try to get score, and save them
              const name = item._links[0].name;
              const match = name.match(regex);
              // console.log("match", name, match[1]);
              if (match && match.length > 1) {
                const score = match[1];
                itemsJson.items[key]._score = Number(score);
                // remove links
                delete item._links;
                isChanged = true;
                if (totalItems % 1000 === 0) {
                  log.info(`Processed ${totalItems} items`);
                }
                totalItems++;
              } else {
                log.info("no match", name, entry.path);
                throw new Error("no match");
              }
            }
          }

          if (isChanged) {
            // console.log("entry.path", entry.path);
            await writeJSONFile(entry.path, itemsJson);
          }

          if (total % 100 === 0) {
            log.info(`Processing ${total} files`);
          }

          total++;
        }
      }
    }
  }
  log.info("total files", totalFiles);
  log.info(
    `fixed data ${total} files `,
  );
}

if (import.meta.main) {
  // init dotenv
  await dotenvConfig({ export: true });
  await uploadArchive();
}
