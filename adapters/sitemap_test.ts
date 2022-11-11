import { fs, parseXml, path } from "../deps.ts";

Deno.test("sitemap parse", async () => {
  const sitemapContent = await Deno.readTextFile(
    // path.join(Deno.cwd(), "example/raw/bloomberg-sitemap.xml"),
    path.join(Deno.cwd(), "example/raw/reuters-sitemap.xml"),
  );
  const sitemap = await parseXml(sitemapContent);
  console.log("sitemap", sitemap);
  await Deno.writeTextFile(
    "./temp-sitemap.json",
    JSON.stringify(sitemap, null, 2),
  );
});
