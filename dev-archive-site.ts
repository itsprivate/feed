import serveArchiveSite from "./serve-archive-site.ts";
import { dotenvConfig } from "./deps.ts";
async function main() {
  await dotenvConfig({
    export: true,
  });
  serveArchiveSite();
}

if (import.meta.main) {
  main();
}
