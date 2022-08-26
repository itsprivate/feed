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
  for await (const entry of fs.walk(getDataPath())) {
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
        const keys = Object.keys(itemsJson.items);

        if (keys.length > 0) {
          for (const key of keys) {
            const item = itemsJson.items[key];
            // remove target site
            const id = item.id;
            const parsed = parseItemIdentifier(id);
            let newId = id;
            if (parsed.year && parsed.month && parsed.day) {
              newId = stringifyItemIdentifier(parsed);
              const newItem = { ...item, id: newId };
              itemsJson.items[newId] = newItem;
              isChanged = true;
              delete itemsJson.items[key];
            }
          }

          if (isChanged) {
            await writeJSONFile(entry.path, itemsJson);
            total++;
          }

          if (total % 100 === 0) {
            log.info(`Processing ${total} files`);
          }
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
interface ParsedFilename {
  id: string;
  year: string;
  month: string;
  day: string;
  language: string;
  type: string;
}
function stringifyItemIdentifier(parsed: ParsedFilename): string {
  return `${parsed.language}_${parsed.type}__${parsed.id}`;
}

function parseItemIdentifier(
  fileBasename: string,
) {
  // remove extension
  let filename = fileBasename;
  if (filename.endsWith(".json")) {
    filename = filename.slice(0, -5);
  }
  const parts = filename.split("__");
  // first will be safe part, other will be the id parts
  const safePart = parts[0];
  const symParts = safePart.split("_");
  const year = symParts[0];
  const month = symParts[1];
  const day = symParts[2];
  const language = symParts[3];
  const type = symParts[4];

  const idParts = parts.slice(1);
  const id = idParts.join("__");
  return {
    id,
    year,
    month,
    day,
    language,
    type,
  };
}
