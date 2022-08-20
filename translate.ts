import { Browser, Page, puppeteer } from "./bad-deps.ts";
import { isMock } from "./util.ts";
import log from "./log.ts";
import { TranslationOptions } from "./interface.ts";
import {
  TARGET_SITE_LANGUAEGS,
  TRANSLATED_ITEMS_PER_PAGE,
} from "./constant.ts";
import { toZhHant } from "./to-zh-hant.ts";
const homepage = "https://www.deepl.com/en/translator-mobile";
export default class Translation {
  browser: Browser | null = null;
  page: Page | null = null;
  private currentTranslated = 0;
  private isMock = isMock();
  private countPerPage = TRANSLATED_ITEMS_PER_PAGE;
  private currentSourceLanguage = "";
  private currentTargetLanguage = "";
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
    this.currentSourceLanguage = "";
    this.currentTargetLanguage = "";
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
        translatedObj[targetLanguage.code] = sentence;
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
        let translated = await this.doTranslate(
          this.page!,
          sentence,
          sourceLanguage,
          targetLanguage.code,
        );
        // remove end newline
        translated = translated.replace(/\n$/, "");
        translatedObj[targetLanguage.code] = translated;
        log.info(`translate ${sentence} to ${translated} success`);
        this.currentTranslated++;
      } else {
        const translated = toZhHant(sentence);
        translatedObj[targetLanguage.code] = translated;
      }
    }

    return translatedObj;
  }
  async doTranslate(
    page: Page,
    sentence: string,
    sourceLanguage = "auto",
    targetLanguage: string,
  ): Promise<string> {
    if (this.isMock) {
      return sentence;
    }
    if (targetLanguage.startsWith("zh")) {
      targetLanguage = "zh";
    }
    // max 5000
    if (sentence.length > 4500) {
      sentence = sentence.substring(0, 4500);
    }
    if (!/^(auto|[a-z]{2})$/.test(sourceLanguage)) {
      throw new Error("INVALID_SOURCE_LANGUAGE");
    }
    if (!/^[a-z]{2}$/.test(targetLanguage)) {
      throw new Error("INVALID_TARGET_LANGUAGE");
    }

    const sourceLangSelect = "button[dl-test=translator-source-lang-btn]",
      targetLangSelect = "button[dl-test=translator-target-lang-btn]",
      sourceLangMenu = "div[dl-test=translator-source-lang-list]",
      targetLangMenu = "div[dl-test=translator-target-lang-list]",
      sourceLangButton =
        `button[dl-test=translator-lang-option-${sourceLanguage}]`,
      targetLangButton =
        `button[dl-test=translator-lang-option-${targetLanguage}]`,
      originalSentenceField = "textarea[dl-test=translator-source-input]",
      targetSentenceField = "textarea[dl-test=translator-target-input]"; /*,
       targetSentencesContainer = '.lmt__translations_as_text'*/

    if (this.currentSourceLanguage !== sourceLanguage) {
      // click  black
      // await page.screenshot({ path: "data/1.png" });
      // console.log("click");
      await page.waitForSelector(sourceLangSelect, { visible: true });

      await page.click(sourceLangSelect);
      await page.waitForTimeout(500);

      await page.waitForSelector(sourceLangMenu, { visible: true });
      await page.waitForTimeout(500);

      try {
        await page.click(sourceLangButton);
      } catch (_) {
        throw new Error("UNSUPPORTED_SOURCE_LANGUAGE");
      }
      // await page.screenshot({ path: "screens/3.png" });

      await page.waitForSelector(sourceLangMenu, { hidden: true });
      this.currentSourceLanguage = sourceLanguage;
    }
    if (this.currentTargetLanguage !== targetLanguage) {
      await page.click(targetLangSelect);
      await page.waitForTimeout(1000);

      await page.waitForSelector(targetLangMenu, { visible: true });

      await page.waitForTimeout(1000);
      try {
        await page.click(targetLangButton);
      } catch (_) {
        throw new Error("UNSUPPORTED_TARGET_LANGUAGE");
      }
      this.currentTargetLanguage = targetLanguage;
    }
    // console.log("wait original");

    await page.waitForSelector(originalSentenceField);
    // console.log("start type", sentence);
    await page.$eval(
      originalSentenceField,
      (el, sentence) => (el.value = sentence),
      sentence,
    );
    await page.waitForTimeout(1500);

    // await page.keyboard.press("Enter");

    const textInputElement = await page.$(originalSentenceField);
    if (!textInputElement) {
      throw new Error("CANNOT_FIND_ORIGINAL_SENTENCE_FIELD");
    }
    await textInputElement.press("Enter"); // Enter Key

    try {
      await page.waitForXPath(
        '//textarea[@dl-test="translator-target-input"]/parent::*/child::*[position()=2]',
      );
    } catch (e) {
      log.warn("can not detect .lmt--active_translation_request");
      log.warn(e);
    }
    await page.waitForXPath(
      '//textarea[@dl-test="translator-target-input"]/parent::*/child::*[position()=2]',
      {
        hidden: true,
        timeout: 90000,
      },
    );

    const result = await page.$eval(targetSentenceField, (el) => el.value);

    const elements = await page.$x(
      "//span[text()='Delete source text']/parent::button",
    );
    await elements[0].click();

    await page.waitForTimeout(1500);

    return result as unknown as string;
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
