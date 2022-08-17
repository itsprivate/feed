import { isMock } from "./util.ts";
import Translation from "./translate.ts";
import { assertEquals } from "./deps.ts";
Deno.test("translate #1", async (t) => {
  const translation = new Translation();
  await translation.init();
  await t.step("translate Hello World", async () => {
    const result = await translation.translate("Hello World", "en");
    if (isMock()) {
      assertEquals(result["zh-Hans"], "Hello World");
    } else {
      assertEquals(result["zh-Hans"], "你好，世界");
    }
  });
  await translation.close();
});
