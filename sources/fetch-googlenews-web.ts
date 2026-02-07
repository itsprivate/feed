import { puppeteer } from "../puppeteer_deps.ts";
import * as cheerio from "npm:cheerio@^1";
import log from "../log.ts";

export interface GoogleNewsWebArticle {
  title: string;
  link: string;
  image: string;
  source: string;
  datetime: string;
  time: string;
  articleType: string;
  _id?: string;
  _url?: string;
}

export async function fetchGoogleNewsWeb(
  url: string,
): Promise<GoogleNewsWebArticle[]> {
  log.info(`Scraping Google News from: ${url}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    page.setViewport({ width: 1366, height: 768 });
    page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36",
    );
    await page.setRequestInterception(true);
    // deno-lint-ignore no-explicit-any
    page.on("request", (request: any) => {
      if (!request.isNavigationRequest()) {
        request.continue();
        return;
      }
      const headers = request.headers();
      headers["Accept"] =
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3";
      headers["Accept-Encoding"] = "gzip";
      headers["Accept-Language"] = "en-US,en;q=0.9,es;q=0.8";
      headers["Upgrade-Insecure-Requests"] = "1";
      headers["Referer"] = "https://www.google.com/";
      request.continue({ headers });
    });

    await page.setCookie({
      name: "CONSENT",
      value: `YES+cb.${
        new Date().toISOString().split("T")[0].replace(/-/g, "")
      }-04-p0.en-GB+FX+667`,
      domain: ".google.com",
    });

    await page.goto(url, { waitUntil: "networkidle2" });

    try {
      const rejectBtn = await page.$(`[aria-label="Reject all"]`);
      if (rejectBtn) {
        await Promise.all([
          page.click(`[aria-label="Reject all"]`),
          page.waitForNavigation({ waitUntil: "networkidle2" }),
        ]);
      }
    } catch (_err) {
      // ignore consent dialog errors
    }

    const content = await page.content();
    const $ = cheerio.load(content);

    const results: GoogleNewsWebArticle[] = [];

    // New structure: anchor on title links
    const titleLinks = $('a[href^="./read/"]').filter(function () {
      // @ts-ignore: cheerio this context
      return $(this).text().trim().length > 0;
    });

    if (titleLinks.length > 0) {
      titleLinks.each(function () {
        // @ts-ignore: cheerio this context
        const titleEl = $(this);
        const title = titleEl.text().trim();
        const rawHref = titleEl.attr("href") || "";
        const link = rawHref.startsWith("./")
          ? rawHref.replace("./", "https://news.google.com/")
          : rawHref;

        // Walk up to find container (ancestor with <time>)
        let container = titleEl.parent();
        for (let depth = 0; depth < 6; depth++) {
          if (container.find("time[datetime]").length) break;
          container = container.parent();
        }

        const source = container
          .find("div[data-n-tid]")
          .filter(function () {
            // @ts-ignore: cheerio this context
            return !$(this).find("div[data-n-tid]").length;
          })
          .first()
          .text()
          .trim();
        const timeEl = container.find("time[datetime]").first();
        const imgEl = container
          .find('img[src*="/api/attachments/"]')
          .first();
        const image =
          imgEl.attr("src") ||
          container.find("figure img").attr("src") ||
          "";

        results.push({
          title,
          link,
          image: image.startsWith("/")
            ? `https://news.google.com${image}`
            : image,
          source,
          datetime: new Date(timeEl.attr("datetime") || "").toISOString(),
          time: timeEl.text().trim(),
          articleType: "topic",
        });
      });
    } else {
      // Fallback: old structure with <article> tags
      const articles = $("article");
      articles.each(function () {
        // @ts-ignore: cheerio this context
        const el = $(this);
        const link =
          el
            .find('a[href^="./article"]')
            ?.attr("href")
            ?.replace("./", "https://news.google.com/") ||
          el
            .find('a[href^="./read"]')
            ?.attr("href")
            ?.replace("./", "https://news.google.com/") ||
          "";
        const srcset = el
          .find("figure")
          .find("img")
          .attr("srcset")
          ?.split(" ");
        const image =
          srcset && srcset.length
            ? srcset[srcset.length - 2]
            : el.find("figure").find("img").attr("src");

        const title =
          el.find("h4").text() ||
          el.find("div > div + div > div a").text() ||
          el.find('a[target="_blank"]').text() ||
          "";

        results.push({
          title: title.trim(),
          link,
          image: image?.startsWith("/")
            ? `https://news.google.com${image}`
            : image || "",
          source: el.find("div[data-n-tid]").text() || "",
          datetime:
            new Date(
              el.find("div:last-child time")?.attr("datetime") || "",
            )?.toISOString() || "",
          time: el.find("div:last-child time").text() || "",
          articleType: "regular",
        });
      });
    }

    await page.close();
    log.info(`Scraped ${results.length} articles from Google News`);
    return results.filter((r) => r.title);
  } finally {
    await browser.close();
  }
}
