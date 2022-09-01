import {
  Author,
  Config,
  Embed,
  FeedItem,
  FeedItemKey,
  FormatedItem,
  GetFeedItemSyncOptions,
  GetFormatedItemOptions,
  Language,
  Link,
  LinkOptions,
  Video,
} from "./interface.ts";
import {
  formatHumanTime,
  getCurrentTranslations,
  getDataFormatedPath,
  getDataRawPath,
  getDataTranslatedPath,
  getFullDay,
  getFullMonth,
  getFullYear,
  getItemTranslations,
  getRedirectedUrl,
  isMock,
  postToUrl,
  request,
  tagToPascalCase,
  tagToUrl,
  tryToRemoveUnnecessaryParams,
} from "./util.ts";
import { DOMParser, getMetadata, tweetPatch } from "./deps.ts";
import log from "./log.ts";
export default class Item<T> {
  originalItem: T;
  private image: string | null | undefined;
  private realUrl: string | null | undefined;
  constructor(originalItem: T) {
    this.originalItem = originalItem;
  }
  init(): Promise<void> {
    // after constructor,  you can do some async operations to init item
    // use by googlenews, for format id, cause google id is too long
    return Promise.resolve();
  }

  getItemIdentifier(): string {
    return `${this.getOriginalLanguage()}_${this.getType()}_${this.getPublishedYear()}_${this.getPublishedMonth()}_${this.getPublishedDay()}__${this.getId()}`;
  }
  getItemIdentifierWithTime(order: number): string {
    const publishedDate = this.getPublishedDate();
    const hour = publishedDate.getHours();
    const minute = publishedDate.getMinutes();
    const second = publishedDate.getSeconds();
    const millisecond = publishedDate.getMilliseconds();
    return `${this.getOriginalLanguage()}_${this.getType()}_${this.getPublishedYear()}_${this.getPublishedMonth()}_${this.getPublishedDay()}_${hour}_${minute}_${second}_${millisecond}_${order}__${this.getId()}`;
  }
  getCachedKey(): string {
    return `${this.getOriginalLanguage()}_${this.getType()}__${this.getId()}`;
  }
  getOriginalLanguage(): string {
    return "en";
  }

  getSensitive(): boolean {
    return false;
  }

  getType(): string {
    return this.constructor.name;
  }
  getOriginalPublished(): string {
    return this.getOriginalPublishedDate().toISOString();
  }
  getOriginalPublishedDate(): Date {
    return new Date(0);
  }

  getOriginalPublishedYear(): string {
    return getFullYear(this.getOriginalPublishedDate());
  }
  getOriginalPublishedMonth(): string {
    return getFullMonth(this.getOriginalPublishedDate());
  }
  getOriginalPublishedDay(): string {
    return getFullDay(this.getOriginalPublishedDate());
  }
  getPublished(): string {
    return this.getPublishedDate().toISOString();
  }
  getPublishedDate(): Date {
    return new Date();
  }

  getPublishedYear(): string {
    return getFullYear(this.getPublishedDate());
  }
  getPublishedMonth(): string {
    return getFullMonth(this.getPublishedDate());
  }
  getPublishedDay(): string {
    return getFullDay(this.getPublishedDate());
  }
  getModifiedDate(): Date {
    return new Date();
  }
  getModified(): string {
    return this.getModifiedDate().toISOString();
  }
  getModifiedYear(): string {
    return getFullYear(this.getModifiedDate());
  }
  getModifiedMonth(): string {
    return getFullMonth(this.getModifiedDate());
  }
  getModifiedDay(): string {
    return getFullDay(this.getModifiedDate());
  }
  getId(): string {
    return "";
  }
  getTitle(): string {
    return "";
  }
  getTitlePrefix(): string {
    // this will not be translated
    return "";
  }
  getTitleSuffix(): string {
    // this will not be translated
    return "";
  }

  getUrl(): string {
    if (this.realUrl) {
      return this.realUrl;
    }
    return "";
  }
  getSiteIdentifier(): string {
    return new URL(this.getUrl()).hostname;
  }
  getImage(): string | undefined | null {
    // undefined means not init
    // null means no image
    const url = this.getUrl();
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const disableImages = [
      "www.githubstatus.com",
      "news.ycombinator.com",
      "github.com",
      "gist.github.com",
      "pypi.org",
    ];
    // ignore specific domain
    if (disableImages.includes(domain)) {
      return null;
    }
    return undefined;
  }
  async tryToLoadImage(
    imageCachedMap?: Record<string, string>,
  ): Promise<string | null> {
    const url = this.getUrl();

    if (imageCachedMap && imageCachedMap[url]) {
      this.image = imageCachedMap[url];
      log.debug(`load image ${imageCachedMap[url]} from cache ${url}`);
      return this.image;
    }

    if (isMock()) {
      this.image = null;
      return null;
    }

    // add siteIdentifier referrer
    log.debug(`try to load image for ${url}`);
    let resource: { text: string; contentType: string };
    try {
      resource = await request(url, {
        referrer: `https://www.google.com`,
      }).then(async (res) => {
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("text/html")) {
            const text = await res.text();
            return {
              text: text,
              contentType: contentType,
            };
          } else {
            throw new Error(
              `fetch ${url} failed, content type is not text/html, it is ${contentType}`,
            );
          }
        } else {
          throw new Error(`fetch ${url} failed`);
        }
      });
    } catch (e) {
      log.debug(e.message);
      this.image = null;
      return null;
    }
    try {
      const doc = new DOMParser().parseFromString(
        resource.text,
        "text/html",
      );
      const metadata = getMetadata(doc, url);
      if (metadata.image) {
        // check image is valid
        const imageResult = await request(metadata.image, {
          method: "HEAD",
        });
        if (imageResult.ok) {
          this.image = metadata.image;
          log.debug(`found image ${this.image} for ${url}`);
          return metadata.image;
        } else {
          this.image = null;
        }
      } else {
        log.debug(`not found image for ${url}`);
        this.image = null;
      }
      return null;
    } catch (_e) {
      log.debug(`parse ${url} html failed`);
      log.debug(_e);
      this.image = null;
      return null;
    }
  }

  getAuthors(): Author[] {
    return [];
  }
  getLinks(_options?: LinkOptions): Link[] {
    return [];
  }

  getVideo(): Video | undefined {
    return undefined;
  }
  getEmbed(): Embed | undefined {
    return undefined;
  }

  getRawPath(targetSiteIdentifiers: string[], order: number): string {
    if (targetSiteIdentifiers.length === 0) {
      throw new Error("targetSiteIdentifiers can not be empty");
    }
    return `${getDataRawPath()}/${this.getModifiedYear()}/${this.getModifiedMonth()}/${this.getModifiedDay()}/${
      targetSiteIdentifiers.join("_")
    }/${this.getItemIdentifierWithTime(order)}.json`;
  }
  getRawItem(): T {
    return this.originalItem;
  }
  getScore(): number {
    return 0;
  }
  getWeightedScore(): number {
    return this.getNumComments() * 2 + this.getScore();
  }
  getNumComments(): number {
    return 0;
  }
  isNeedToGetRedirectedUrl(): boolean {
    return false;
  }
  getFormatedPath(targetSiteIdentifiers: string[]): string {
    return `${getDataFormatedPath()}/${this.getModifiedYear()}/${this.getModifiedMonth()}/${this.getModifiedDay()}/${
      targetSiteIdentifiers.join("_")
    }/${this.getItemIdentifier()}.json`;
  }
  getTranslatedPath(targetSiteIdentifiers: string[]): string {
    return `${getDataTranslatedPath()}/${this.getModifiedYear()}/${this.getModifiedMonth()}/${this.getModifiedDay()}/${
      targetSiteIdentifiers.join("_")
    }/${this.getItemIdentifier()}.json`;
  }
  getExternalUrl(): string | undefined {
    return undefined;
  }
  getTranslation(): Record<string, string> {
    return {
      "title": this.getTitle(),
    };
  }
  getFullTranslations(): Record<string, Record<string, string>> | undefined {
    return undefined;
  }
  getFormatedItemSync(): FormatedItem {
    // this function will only format the original item
    // if you need the final formated item, please use getFeedItem()
    const externalUrl = this.getExternalUrl();
    let translations: Record<string, Record<string, string>> = {};

    if (this.getFullTranslations()) {
      translations = this.getFullTranslations()!;
    } else {
      translations[this.getOriginalLanguage()] = this.getTranslation();
    }
    const image = this.getImage();

    const item: FormatedItem = {
      id: this.getItemIdentifier(),
      url: this.realUrl || this.getUrl(),
      date_published: this.getPublished(),
      date_modified: this.getModified(),
      _original_published: this.getOriginalPublished(),
      _original_language: this.getOriginalLanguage(),
      _translations: translations,
      _links: this.getLinks({ isUseHTML: true }),
    };

    const tags = this.getTags();
    if (tags && Array.isArray(tags) && tags.length > 0) {
      item.tags = tags;
    }
    const authors = this.getAuthors();
    if (authors && Array.isArray(authors) && authors.length > 0) {
      item.authors = authors;
    }
    if (this.getScore()) {
      item._score = this.getScore();
    }
    if (this.getNumComments()) {
      item._num_comments = this.getNumComments();
    }
    if (this.getTitlePrefix()) {
      item._title_prefix = this.getTitlePrefix();
    }
    if (this.getTitleSuffix()) {
      item._title_suffix = this.getTitleSuffix();
    }

    if (this.getSensitive()) {
      item._sensitive = true;
    }

    if (image) {
      item.image = image;
    }
    const video = this.getVideo();
    if (video) {
      item._video = video;
    }
    const embed = this.getEmbed();
    if (embed) {
      item._embed = embed;
    }
    if (externalUrl) {
      item.external_url = externalUrl;
    }
    return item;
  }
  async getFormatedItem(
    options?: GetFormatedItemOptions,
  ): Promise<FormatedItem> {
    const formatedItem = this.getFormatedItemSync();
    if (this.getImage() === undefined) {
      let imageCachedMap: Record<string, string> = {};
      if (options && options.imageCachedMap) {
        imageCachedMap = options.imageCachedMap;
      }
      await this.tryToLoadImage(imageCachedMap);
      if (this.image) {
        formatedItem.image = this.image;
      }
    }

    if (this.isNeedToGetRedirectedUrl()) {
      if (this.realUrl === undefined) {
        // try to get redirected url
        const originalUrl = this.getUrl();
        const redirectedUrl = await getRedirectedUrl(originalUrl);
        this.realUrl = tryToRemoveUnnecessaryParams(redirectedUrl);
        formatedItem.url = this.realUrl;
      }
    }

    return formatedItem;
  }
  isValid(): boolean {
    return true;
  }
  getFeedItemSync(
    siteIdentifier: string,
    language: Language,
    config: Config,
    options?: GetFeedItemSyncOptions,
  ): FeedItem {
    let versionCode = "default";
    if (options && options.versionCode) {
      if (options.versionCode === "lite") {
        versionCode = "lite";
      } else if (options.versionCode === "default") {
        versionCode = "default";
      } else {
        log.warn(`unsupported version ${options.versionCode}, use default`);
      }
    }
    const isLite = versionCode === "lite";
    const version = config.versions.find((v) => v.code === versionCode);
    if (!version) {
      throw new Error(`version ${versionCode} not found`);
    }
    const formatedItem = this.getFormatedItemSync();
    const item: FeedItem = {
      title: "",
      summary: "",
      content_text: "",
      content_html: "",
      ...formatedItem,
    };

    // format id to url

    if (item.id) {
      item.id = postToUrl(item.id, siteIdentifier, language, version, config);
    }

    const itemUrl = this.getUrl();
    const itemUrlObj = new URL(itemUrl);
    const translationObj = getItemTranslations(
      item._translations || {},
      language.code,
      item._original_language,
    );

    const originalTranslationObj = getItemTranslations(
      item._translations || {},
      item._original_language,
      item._original_language,
    );
    const translationFields = Object.keys(translationObj);
    for (const translationField of translationFields) {
      let translationValue = translationObj[translationField];
      // is has prefix
      if (item[`_${translationField}_prefix` as FeedItemKey]) {
        translationValue = `${
          item[`_${translationField}_prefix` as FeedItemKey]
        }${translationValue}`;
      }
      // is has suffix
      if (item[`_${translationField}_suffix` as FeedItemKey]) {
        translationValue = `${translationValue}${
          item[`_${translationField}_suffix` as FeedItemKey]
        }`;
      }
      item[translationField as FeedItemKey] = translationValue as never;
    }

    let summary = "";
    let content_text = "";
    let content_html = "";
    const isSensitive = item._sensitive || false;
    if (!isSensitive && !isLite) {
      if (item._video) {
        const sources = item._video.sources;
        const height = item._video.height;
        const width = item._video.width;
        const poster = item._video.poster;
        content_html = `<video playsinline controls preload="none"`;
        if (width) {
          content_html += ` width="${width}"`;
        }
        if (height) {
          content_html += ` height="${height}"`;
        }
        if (poster) {
          content_html += ` poster="${poster}"`;
        }

        content_html += `>`;
        for (const source of sources) {
          content_html += `<source src="${source.url}"`;
          if (source.type) {
            content_html += ` type="${source.type}"`;
          }
          content_html += `>`;
        }
        content_html += "your browser does not support the video tag.</video>";
      } else if (item._embed) {
        // add embed code
        const embedType = item._embed.type;
        const embedProvider = item._embed.provider;
        const embedUrl = item._embed.url;

        if (embedType === "video" && embedProvider === "youtube" && embedUrl) {
          const embedUrlObj = new URL(embedUrl);
          const embedUrlParams = embedUrlObj.searchParams;
          const embedUrlVideoId = embedUrlParams.get("v");
          if (embedUrlVideoId) {
            content_html += `<iframe
            class="embed-video"
            loading="lazy"
            src="https://www.youtube.com/embed/${embedUrlVideoId}&autoplay=1"
            srcdoc="<style>*{padding:0;margin:0;overflow:hidden}html,body{height:100%}img,span{position:absolute;width:100%;top:0;bottom:0;margin:auto}span{height:1.5em;text-align:center;font:48px/1.5 sans-serif;color:white;text-shadow:0 0 0.5em black}</style><a href=https://www.youtube.com/embed/${embedUrlVideoId}?autoplay=1><img src=https://img.youtube.com/vi/${embedUrlVideoId}/hqdefault.jpg loading='lazy' alt='Youtube Preview Image'><span>▶</span></a>"
            frameborder="0"
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>`;
          } else {
            throw new Error("youtube video id not found: " + embedUrl);
          }
        } else {
          throw new Error(
            "not supported embed type: " + embedProvider + embedType + " , " +
              embedUrl,
          );
        }
      } else if (item.image) {
        const imageUrl = new URL(item.image);

        content_html +=
          `<div><img loading="lazy" class="u-photo" src="${item.image}" alt="${imageUrl.hostname} image"></div>`;
      }
    }

    content_html += ``;
    if (item._original_language !== language.code) {
      let finalTitle = originalTranslationObj.title;
      if (this.getType() === "twitter") {
        // @ts-ignore: npm modules
        finalTitle = tweetPatch(
          originalTranslationObj.title,
        );
      }
      content_html +=
        `<div>${finalTitle} (<a href="${itemUrl}">${itemUrlObj.hostname}</a>)</div>`;

      summary += `${originalTranslationObj.title}`;
      content_text += `${originalTranslationObj.title}`;
    }
    content_html +=
      `<footer><a href="${item.id}"><time class="dt-published published" datetime="${item._original_published}">${
        formatHumanTime(
          new Date(item._original_published as string),
        )
      }</time></a>&nbsp;&nbsp;`;

    const currentTranslations = getCurrentTranslations(
      siteIdentifier,
      language.code,
      config,
    );
    let index = 0;

    // add links
    if (this.getLinks({ isUseHTML: true }).length > 0) {
      for (const link of this.getLinks({ isUseHTML: true })) {
        const isGreaterFirst = index >= 1;
        const linkName = currentTranslations[link.name] ??
          link.name;
        content_html += `${
          isGreaterFirst ? "&nbsp;&nbsp;" : ""
        }<a href="${link.url}">${linkName}</a>`;
        index++;
      }
    }
    // add text tags
    if (item.tags && Array.isArray(item.tags) && item.tags.length > 0) {
      for (const tag of item.tags) {
        if (tagToPascalCase(tag)) {
          content_text += `${content_text ? " " : ""}#${tagToPascalCase(tag)}`;
        }
      }
    }
    // add text links
    const linkMap: Record<string, boolean> = {};
    if (this.getLinks().length > 0) {
      for (const link of this.getLinks()) {
        const linkName = currentTranslations[link.name] ??
          link.name;
        linkMap[link.url] = true;
        // check if old.reddit
        const linkUrlObj = new URL(link.url);
        if (linkUrlObj.hostname === "old.reddit.com") {
          linkUrlObj.hostname = "www.reddit.com";
          linkMap[linkUrlObj.toString()] = true;
        } else if (linkUrlObj.hostname === "www.reddit.com") {
          linkUrlObj.hostname = "old.reddit.com";
          linkMap[linkUrlObj.toString()] = true;
        }
        content_text += `\n${linkName}: ${link.url}`;
      }
    }
    // add tags
    if (item.tags && Array.isArray(item.tags) && item.tags.length > 0) {
      for (const tag of item.tags) {
        const isGreaterFirst = index >= 1;
        content_html += `${isGreaterFirst ? "&nbsp;&nbsp;" : ""}<a href="${
          tagToUrl(tag, siteIdentifier, language, version, config)
        }">#${tag}</a>`;
        index++;
      }
    }
    // check is need add original link
    if (!linkMap[this.getUrl()]) {
      // then add
      content_text += `\n${
        currentTranslations.source_link_label || "Source"
      }: ${this.getUrl()}`;
    }

    content_html += "</footer>";

    item.summary = summary;
    item.content_text = content_text;
    item.content_html = content_html;
    // add feed 1.0 adapter author
    if (
      item.authors && Array.isArray(item.authors) &&
      item.authors.length > 0
    ) {
      item.author = item.authors[0];
    }

    return item;
  }
  getTags(): string[] {
    return [];
  }
}
