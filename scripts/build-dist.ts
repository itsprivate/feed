// Standalone script: download data and build dist files for specified site(s).
// Usage: deno run -A scripts/build-dist.ts <site_id> [site_id2 ...]
// Example: deno run -A scripts/build-dist.ts bloombergnew
// Example: deno run -A scripts/build-dist.ts bloombergnew hnnew
//
// What it does:
// 1. Downloads prod-cache.zip from S3 using the project's S3 module
// 2. Decompresses it (gets prod-cache/ and prod-current/)
// 3. Runs build_site to generate static files
// 4. Copies output to dist/<site>/
//
// Options:
//   --skip-download  Skip S3 download (use existing prod-current/ data)

import { dotenvConfig, fs, path } from "../deps.ts";
import buildConfig from "../build-config.ts";
import {
  getCurrentDataS3Bucket,
  getDistPath,
  getGenConfig,
  siteIdentifierToPath,
} from "../util.ts";
import { decompress } from "../bad-deps.ts";
import buildSite from "../workflows/6-build-site.ts";
import log from "../log.ts";

const DIST_DIR = "dist";
const CACHE_ZIP = "prod-cache.zip";

async function downloadAndDecompress() {
  const bucket = getCurrentDataS3Bucket("feed");
  log.info(`downloading ${CACHE_ZIP} from S3...`);
  const obj = await bucket.getObject(CACHE_ZIP);
  if (!obj || !obj.body) {
    throw new Error(`Failed to download ${CACHE_ZIP} from S3`);
  }
  // Write to local file
  const data = new Uint8Array(await new Response(obj.body).arrayBuffer());
  await Deno.writeFile(CACHE_ZIP, data);
  const stat = await Deno.stat(CACHE_ZIP);
  log.info(
    `downloaded ${CACHE_ZIP}, size: ${(stat.size / 1000000).toFixed(2)} MB`,
  );

  // Decompress
  log.info("decompressing...");
  await decompress(CACHE_ZIP);
  await Deno.remove(CACHE_ZIP);
  log.info("decompressed");
}

async function main() {
  await dotenvConfig({ export: true });

  // Force PROD mode
  Deno.env.set("PROD", "1");

  await buildConfig();

  const siteIds = Deno.args.filter((a) => !a.startsWith("-"));
  const skipDownload = Deno.args.includes("--skip-download");

  if (siteIds.length === 0) {
    console.error(
      "Usage: deno run -A scripts/build-dist.ts <site_id> [site_id2 ...]",
    );
    console.error("Example: deno run -A scripts/build-dist.ts bloombergnew");
    console.error("");
    console.error("Options:");
    console.error(
      "  --skip-download  Skip S3 download (use existing prod-current/ data)",
    );
    Deno.exit(1);
  }

  const config = await getGenConfig();

  // Validate site ids
  for (const siteId of siteIds) {
    if (!config.sites[siteId]) {
      console.error(`Error: site "${siteId}" not found in config`);
      Deno.exit(1);
    }
  }

  // Step 1: Download and decompress data
  if (!skipDownload) {
    await downloadAndDecompress();
  } else {
    log.info("skipping download (--skip-download)");
  }

  // Step 2: Build site
  log.info(`building sites: ${siteIds.join(", ")}`);
  await buildSite({
    siteIdentifiers: siteIds,
    config,
  });

  // Step 3: Copy from prod-public/ to dist/
  const distSource = getDistPath();

  for (const siteId of siteIds) {
    const sitePath = siteIdentifierToPath(siteId);
    const srcDir = path.join(distSource, sitePath);
    const destDir = path.join(DIST_DIR, sitePath);

    try {
      await Deno.stat(srcDir);
    } catch {
      log.warn(`no build output for ${siteId} at ${srcDir}, skipping`);
      continue;
    }

    // Clean target and copy
    try {
      await Deno.remove(destDir, { recursive: true });
    } catch {
      // ignore
    }
    await fs.copy(srcDir, destDir, { overwrite: true });
    log.info(`copied ${siteId} -> ${destDir}/`);
  }

  log.info(`Done! Output in ${DIST_DIR}/`);
}

if (import.meta.main) {
  await main();
}
