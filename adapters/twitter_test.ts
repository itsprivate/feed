import { assertEquals } from "../deps.ts";
Deno.test("twitter date parse #1", () => {
  const str = "Mon Feb 28 14:10:45 +0000 2022";
  const date = new Date(str);
  assertEquals(date.getFullYear(), 2022);
  assertEquals(date.getMonth(), 1);
  assertEquals(date.getDate(), 28);
});
