import { Browser, Page, puppeteer } from "./deps.ts";
import d from "./d.ts";
import { isMock } from "./util.ts";
import log from "./log.ts";
import { TranslationOptions } from "./interface.ts";
import {
  TARGET_SITE_LANGUAEGS,
  TRANSLATED_ITEMS_PER_PAGE,
} from "./constant.ts";
const homepage = "https://www.deepl.com/en/translator-mobile";
export default class Translation {
  browser: Browser | null = null;
  page: Page | null = null;
  private currentTranslated = 0;
  private isMock = isMock();
  private countPerPage = TRANSLATED_ITEMS_PER_PAGE;
  constructor(options: TranslationOptions = {}) {
    if (options.isMock !== undefined) {
      this.isMock = options.isMock;
    }

    if (options.countPerPage !== undefined) {
      this.countPerPage = options.countPerPage;
    }
  }
  async init() {
    if (this.isMock) {
      log.info("mock mode: init puppeteer page success");
      return;
    }
    // init puppeteer
    const isHeadless = !(Deno.env.get("HEADLESS") === "0");
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        devtools: true,
        // defaultViewport: null,
        headless: isHeadless, // !isDev,
        defaultViewport: {
          width: 393,
          height: 851,
          // deviceScaleFactor: 2,
          isMobile: true,
        },
        args: ["--lang=zh-Hans,zh", "--disable-gpu", "--no-sandbox"],
      });
      this.browser.on("disconnected", () => (this.browser = null));
    }
    if (!this.page) {
      const pages = await this.browser.pages();
      if (pages[0]) {
        this.page = pages[0];
      } else {
        this.page = await this.browser.newPage();
      }

      await this.page.setUserAgent(
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36",
      );

      this.page.setExtraHTTPHeaders({ referer: "https://www.google.com/" });

      await this.page.goto(homepage, { waitUntil: "domcontentloaded" });

      await this.page.waitForXPath(
        "//span[@data-testid='deepl-ui-tooltip-target']",
      );
    }
    log.info("init puppeteer page success");
  }
  async translate(
    sentence: string,
    sourceLanguage: string,
  ): Promise<Record<string, string>> {
    // if mock
    if (this.isMock) {
      const translatedObj: Record<string, string> = {};
      for (const targetLanguage of TARGET_SITE_LANGUAEGS) {
        if (targetLanguage.code !== "zh-Hant") {
          translatedObj[targetLanguage.code] = sentence;
        }
      }
      return translatedObj;
    }
    if (!this.page) {
      throw new Error("page not init, must call init() first");
    }

    // if current translated count if greater than 10, close page and init again
    if (this.currentTranslated >= this.countPerPage) {
      await this.page.close();
      this.page = null;
      await this.init();
      this.currentTranslated = 0;
    }
    const translatedObj: Record<string, string> = {};
    for (const targetLanguage of TARGET_SITE_LANGUAEGS) {
      if (targetLanguage.code !== "zh-Hant") {
        let translated = await d(
          this.page!,
          sentence,
          sourceLanguage,
          targetLanguage.code,
          {
            mock: this.page === null,
          },
        );
        // remove end newline
        translated = translated.replace(/\n$/, "");
        translatedObj[targetLanguage.code] = translated;
        this.currentTranslated++;
      }
    }

    return translatedObj;
  }
  async close() {
    if (this.page) {
      await this.page.close();
    }
    // quit puppeteer
    if (this.browser) {
      await (this.browser as Browser)!.close();
    }
  }
}
