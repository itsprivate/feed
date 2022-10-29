import twitter from "./twitter.ts";
import { request, sha1 } from "../util.ts";
import log from "../log.ts";

export default class spectator extends twitter {
  getTitleTrimedPrefix(): string {
    return "BREAKING: ";
  }
  getTags() {
    return [];
  }
}
