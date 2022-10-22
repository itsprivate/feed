import getMetadata from "./get-ft-metadata.ts";

Deno.test("get ft metadata", async () => {
  const html = await Deno.readTextFile("./example/raw/ft.html");
  const metadata = getMetadata(html);
  console.log("metadata", metadata);
});
