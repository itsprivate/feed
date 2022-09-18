import twitter from "./twitter.ts";
import { request, sha1 } from "../util.ts";
import log from "../log.ts";

export default class thechinaproject extends twitter {
  getTitleTrimedSuffix(): string {
    return " – The China Project";
  }
}
