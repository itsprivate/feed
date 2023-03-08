import { Deepl as DPro } from "https://esm.sh/immersive-translate@1.0.8";
// load env
import "https://deno.land/x/dotenv/load.ts";
const d = new DPro(Deno.env.get("IM_DEEPL_AUTH_KEY"));

const result = await d.translateText(
  "hello world",
  "EN",
  "ZH",
);
console.log("result", result);
