import { loadS3ArchiveFile } from "./util.ts";

Deno.test("loadS3ArchiveFile #1", async () => {
  if (Deno.env.get("ARCHIVE_SECRET_ACCESS_KEY")) {
    await loadS3ArchiveFile("test/test.json");
    console.log("done");
  }
});

Deno.test("loadS3ArchiveFile #2", async () => {
  if (Deno.env.get("ARCHIVE_SECRET_ACCESS_KEY")) {
    await loadS3ArchiveFile("hackernews/tags/job/items.json");
    console.log("done");
  }
});
