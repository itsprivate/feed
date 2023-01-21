import D from "./d.ts";

Deno.test("#1", async () => {
  const d = new D();
  const result = await d.translate("Hello World.", "en", ["zh-Hans"]);
  console.log("result", result);
});
