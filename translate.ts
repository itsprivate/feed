import puppeteer, {
  Browser,
  Page,
} from "https://deno.land/x/puppeteer@14.1.1/mod.ts";

import d from "./deepl.ts";
const homepage = "https://www.deepl.com/en/translator-mobile";
import { isDev } from "./util.ts";
import log from "./log.ts";
import { TranslationOptions } from "./interface.ts";
export const TRANSLATION_LENGTH_PER_INSTANCE = isDev() ? 3 : 100;

export default class Translation {
  browser: Browser | null = null;
  page: Page | null = null;
  private currentTranslated = 0;
  private isMock = false;
  private countPerPage = 100;
  constructor(options: TranslationOptions = {}) {
    if (options.mock) {
      this.isMock = true;
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
      return {
        "zh-Hans": sentence,
      };
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
    let translated = await d(
      this.page!,
      sentence,
      sourceLanguage,
      "zh",
      {
        mock: this.page === null,
      },
    );
    // remove end newline
    translated = translated.replace(/\n$/, "");
    this.currentTranslated++;
    return {
      "zh-Hans": translated,
    };
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
