import serveArchiveSite from "./serve-archive-site.ts";
import { dotenvConfig } from "./deps.ts";
async function main() {
  await dotenvConfig({
    export: true,
  });
  serveArchiveSite(9000);
}

if (import.meta.main) {
  main();
}
