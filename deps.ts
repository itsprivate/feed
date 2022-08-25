// std
export * as YAML from "https://deno.land/std@0.151.0/encoding/yaml.ts";
export * as TOML from "https://deno.land/std@0.151.0/encoding/toml.ts";
export * as path from "https://deno.land/std@0.151.0/path/mod.ts";
export * as fs from "https://deno.land/std@0.151.0/fs/mod.ts";
export * as dotenv from "https://deno.land/std@0.151.0/dotenv/mod.ts";
export * as datetime from "https://deno.land/std@0.151.0/datetime/mod.ts";
export * as async from "https://deno.land/std@0.151.0/async/mod.ts";
export * as flags from "https://deno.land/std@0.151.0/flags/mod.ts";
export * as colors from "https://deno.land/std@0.151.0/fmt/colors.ts";
export { DateTimeFormatter } from "https://deno.land/std@0.151.0/datetime/formatter.ts";
export {
  assert,
  assertAlmostEquals,
  assertArrayIncludes,
  assertEquals,
  assertExists,
  assertMatch,
  assertNotEquals,
  assertNotMatch,
  assertObjectMatch,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "https://deno.land/std@0.151.0/testing/asserts.ts";
export { serve } from "https://deno.land/std@0.152.0/http/server.ts";
export { contentType } from "https://deno.land/std@0.152.0/media_types/mod.ts";
export {
  serveDir,
  serveFile,
} from "https://deno.land/x/std@0.152.0/http/file_server.ts";
export * as posixPath from "https://deno.land/std@0.152.0/path/posix.ts";
export { config as dotenvConfig } from "https://deno.land/std@0.152.0/dotenv/mod.ts";
// third party modules

export { default as SimpleTwitter } from "https://deno.land/x/simple_twitter_deno@0.05/simple_twitter_deno.ts";
export { DigestClient } from "https://deno.land/x/digest_fetch@v1.2.1/mod.ts";
export {
  DOMParser,
  Element,
} from "https://deno.land/x/deno_dom@v0.1.33-alpha/deno-dom-wasm.ts";
export type {
  DOMParserMimeType,
} from "https://deno.land/x/deno_dom@v0.1.33-alpha/deno-dom-wasm.ts";
export { parseFeed } from "https://deno.land/x/rss@0.5.6/mod.ts";

export { default as staticFiles } from "https://deno.land/x/static_files@1.1.6/mod.ts";
export { S3, S3Bucket } from "./s3/mod.ts";
// export { S3, S3Bucket } from "https://deno.land/x/s3@0.5.0/mod.ts";
// export { S3Client } from "https://deno.land/x/s3_lite_client@0.2.0/mod.ts";
// export { S3Client } from "../inbox/deno-s3-lite-client/mod.ts";

// npm modules
export { getMetadata } from "https://jspm.dev/page-metadata-parser@1.1.4";
// export { default as slug } from "https://jspm.dev/slug@6.0.0";
import transliteration from "https://jspm.dev/transliteration@2.3.5";
// @ts-ignore: npm module
const slug = transliteration.slugify;
export { slug };
export { default as kebabCase } from "https://jspm.dev/lodash@4.17.21/kebabCase";

export { default as mustache } from "https://jspm.dev/mustache@4.2.0";
export { default as jsonfeedToAtom } from "https://jspm.dev/jsonfeed-to-atom@1.2.2";
export { default as jsonfeedToRSS } from "https://jspm.dev/jsonfeed-to-rss@3.0.6";
export { default as tweetPatch } from "https://jspm.dev/tweet-patch@2.0.5";
