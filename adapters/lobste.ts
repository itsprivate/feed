import RSS from "./rss.ts";
import { sha1 } from "../util.ts";
import log from "../log.ts";
import { Author } from "../interface.ts";
export default class lobste extends RSS {
  getId(): string {
    const urlPattern = new URLPattern({
      pathname: "/s/:id",
    });
    const result = urlPattern.exec(super.getId());

    if (result?.pathname.groups.id) {
      return result.pathname.groups.id;
    }
    throw new Error("Can't get lobste id");
  }
  getExternalUrl(): string | undefined {
    return this.originalItem.comments;
  }
  getAuthors(): Author[] {
    const authors: Author[] = [];
    const authorName = this.originalItem.author.name;
    const splited = authorName.split(" ");
    const usermail = splited[0];
    const username = splited[1];
    const userID = usermail.slice(0, usermail.indexOf("@"));
    const name = username.slice(1, username.length - 1);
    authors.push({
      name: name,
      url: `https://lobste.rs/u/${userID}`,
    });
    return authors;
  }
}
