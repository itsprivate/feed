import { isMock } from "./util.ts";
import Translation from "./translate.ts";
import { assertEquals } from "./deps.ts";
if (!isMock()) {
  Deno.test("translate #1", async (t) => {
    console.log("yessss");
    const translation = new Translation();
    await translation.init();
    await t.step("translate Hello World", async () => {
      const result = await translation.translate("Hello World", "en");
      assertEquals(result["zh-Hans"], "你好，世界");
    });
    await translation.close();
  });
} else {
  Deno.test("translate #2", async (t) => {
    console.log("yessss2222");
    const translation = new Translation();
    await t.step("translate Hello World", async () => {
      const result = await translation.translate("Hello World", "en");
      assertEquals(result["zh-Hans"], "Hello World");
    });
    await translation.close();
  });
}
