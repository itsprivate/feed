import { Page } from "./bad-deps.ts";
import log from "./log.ts";
export default async (
  page: Page,
  sentence: string,
  sourceLanguage = "auto",
  targetLanguage: string,
  { mock = false },
): Promise<string> => {
  if (mock) {
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

  await page.click(targetLangSelect);
  await page.waitForTimeout(1000);

  await page.waitForSelector(targetLangMenu, { visible: true });

  await page.waitForTimeout(1000);
  try {
    await page.click(targetLangButton);
  } catch (_) {
    throw new Error("UNSUPPORTED_TARGET_LANGUAGE");
  }

  // console.log("wait original");

  await page.waitForSelector(originalSentenceField);
  // console.log("start type", sentence);
  await page.$eval(
    originalSentenceField,
    (el, sentence) => (el.value = sentence),
    sentence,
  );
  await page.waitForTimeout(2000);

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

  await page.waitForTimeout(2000);

  return result as unknown as string;
};
