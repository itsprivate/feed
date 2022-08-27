import log from "../log.ts";
import { YAML } from "../deps.ts";
const sites = [
  "ask",
  "crp",
  "dep",
  "dev",
  "ec",
  "hn",
  "news",
  "ny",
  "ph",
  "qu",
  "rs",
  "rt",
  "sp",
  "wsj",
];
function printGitClone() {
  let txt = ``;

  for (const site of sites) {
    txt += `git clone git@gitlab.com:theowenyoung/${site}.git --depth 1\n`;
  }
  console.log(txt);
}

async function downloadSiteConfig() {
  for (const site of sites) {
    const configUrl =
      `https://gitlab.com/theowenyoung/${site}/-/raw/main/config/index.js`;
    const text = await fetch(configUrl).then((res) => res.text());
    await Deno.writeTextFile(`./temp/${site}-config.js`, text);
    log.info(`Downloaded ${site} config`);
  }
}

function printImport() {
  let txt = `const configs = {};\n`;
  for (const site of sites) {
    txt += `const ${site} = await import("../temp/${site}-config.js");
configs.${site} = ${site};\n`;
  }
  console.log(txt);
}

async function getNewSettings() {
  const configs = {};
  const ask = await import("../temp/ask-config.js");
  configs.ask = ask;
  const crp = await import("../temp/crp-config.js");
  configs.crp = crp;
  const dep = await import("../temp/dep-config.js");
  configs.dep = dep;
  const dev = await import("../temp/dev-config.js");
  configs.dev = dev;
  const ec = await import("../temp/ec-config.js");
  configs.ec = ec;
  const hn = await import("../temp/hn-config.js");
  configs.hn = hn;
  const news = await import("../temp/news-config.js");
  configs.news = news;
  const ny = await import("../temp/ny-config.js");
  configs.ny = ny;
  const ph = await import("../temp/ph-config.js");
  configs.ph = ph;
  const qu = await import("../temp/qu-config.js");
  configs.qu = qu;
  const rs = await import("../temp/rs-config.js");
  configs.rs = rs;
  const rt = await import("../temp/rt-config.js");
  configs.rt = rt;
  const sp = await import("../temp/sp-config.js");
  configs.sp = sp;
  const wsj = await import("../temp/wsj-config.js");
  configs.wsj = wsj;
  // console.log("configs", configs);
  const realConfig = Object.keys(configs).map((key) => {
    const config = configs[key];
    return config.default;
  });
  // console.log("realConfig", realConfig);
  const finalCofnig = {
    sites: {},
  };
  for (const config of realConfig) {
    finalCofnig.sites[config.siteUrl] = {
      translations: {},
    };
    const translations = {
      "zh-Hans": {
        title: config.title,
        description: config.description,
        keyworkds: config.keywords.join(","),
        short_title: config.shortTitle,
      },
    };

    if (config.localize) {
      for (const locale of config.localize) {
        translations[locale.locale] = {
          title: locale.title,
          short_title: config.shortTitle,
          description: locale.description,
          keywords: locale.keywords.join(","),
        };
      }
    }
    finalCofnig.sites[config.siteUrl].translations = translations;
  }
  const yaml = (YAML.stringify(finalCofnig));

  Deno.writeTextFile(`./temp/config.yml`, yaml);
}

getNewSettings();
