import { fs, path } from "../deps.ts";
import { RunOptions } from "../interface.ts";
import adapters from "../adapters/mod.ts";
import {
  getDataFormatedPath,
  getDataRawPath,
  getDataTranslatedPath,
  getFilesByTargetSiteIdentifiers,
  getTargetSiteIdentifiersByFilePath,
  identifierToCachedKey,
  isDev,
  parseItemIdentifier,
  readJSONFile,
  writeJSONFile,
} from "../util.ts";
import log from "../log.ts";

async function main() {
  const allFormatedFiles: string[] = [];
  // check if folder exists
  await fs.ensureDir(getDataFormatedPath());
  for await (const entry of fs.walk(getDataFormatedPath())) {
    if (entry.isFile && entry.name.endsWith(".json")) {
      allFormatedFiles.push(entry.path);
    }
  }

  const allTranslatedFiles: string[] = [];
  // check if folder exists
  await fs.ensureDir(getDataTranslatedPath());
  for await (const entry of fs.walk(getDataTranslatedPath())) {
    if (entry.isFile && entry.name.endsWith(".json")) {
      allTranslatedFiles.push(entry.path);
    }
  }

  // now we compare allFormatedFiles with files, files is more recent than allFormatedFiles

  const rawFilesMap = new Map<string, string>();
  for (const file of allFormatedFiles) {
    const identifier = path.basename(file, ".json");
    const cachedKey = identifierToCachedKey(identifier);
    rawFilesMap.set(cachedKey, file);
  }

  const duplicatedFiles = allFormatedFiles.filter((file) => {
    const identifier = path.basename(file, ".json");
    const cachedKey = identifierToCachedKey(identifier);
    return rawFilesMap.has(cachedKey);
  });
  log.info("duplicatedFiles", duplicatedFiles);
}
if (import.meta.main) {
  main();
}
