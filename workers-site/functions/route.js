import { TARGET_SITE_LANGUAEGS } from "../../common.js";
const newHostname = "i.buzzing.cc";
export const handleRequest = ({ request }) => {
  // check old url and redirect to new url
  const routeInfo = parseUrl(request.url);
  const url = routeInfo.url;
  const language = routeInfo.language;
  const subdomain = routeInfo.subdomain;
  const pathname = routeInfo.pathname;
  const tagPattern = new URLPattern({
    pathname: "/tags/:tag",
  });
  const issuePattern = new URLPattern({
    pathname: "/issues/:issue",
  });
  const tagPattern2 = new URLPattern({
    pathname: "/tags/:tag/",
  });
  const issuePattern2 = new URLPattern({
    pathname: "/issues/:issue/",
  });
  const tagMatch = tagPattern.test(url);
  const tagMatch2 = tagPattern2.test(url);
  const issueMatch = issuePattern.exec(url);
  const issueMatch2 = issuePattern2.exec(url);

  // check subpath

  if (tagMatch || tagMatch2) {
    // redirect to new url
    const newUrl = new URL(url);

    newUrl.pathname = "/" + language.prefix + subdomain + pathname;
    // add slash
    if (!newUrl.pathname.endsWith("/")) {
      newUrl.pathname += "/";
    }
    newUrl.hostname = newHostname;

    return Response.redirect(newUrl.href, 301);
  } else if (issueMatch || issueMatch2) {
    const issueNumber = (issueMatch || issueMatch2).pathname.groups.issue;
    const newIssue = getNewIssue(subdomain, issueNumber);
    if (newIssue) {
      const newUrl = new URL(url);
      newUrl.pathname =
        "/" + language.prefix + subdomain + "/issues/" + newIssue + "/";
      newUrl.hostname = newHostname;
      return Response.redirect(newUrl.href, 302);
    } else {
      return new Response("Not Found Issue, 404", {
        status: 404,
      });
    }
    // calculate new issue
  } else {
    return new Response("Not Found, 404", {
      status: 404,
    });
  }
};

function getSubsiteIdentifier(url) {
  const urlObj = new URL(url);
  let subsiteIdentifier = urlObj.hostname.split(".")[0];
  if (subsiteIdentifier.startsWith("dev-")) {
    subsiteIdentifier = subsiteIdentifier.slice(4);
  }
  if (subsiteIdentifier.startsWith("prod")) {
    subsiteIdentifier = subsiteIdentifier.slice(4);
  }
  return subsiteIdentifier;
}

function parseUrl(urlStr) {
  console.log("urlStr", urlStr);
  const url = new URL(urlStr);
  const subsiteIdentifier = getSubsiteIdentifier(url);
  // get language code
  const langField = url.pathname.split("/")[1];
  // check if language code is valid
  let language = TARGET_SITE_LANGUAEGS[0];
  let pathname = url.pathname;
  for (const targetLang of TARGET_SITE_LANGUAEGS) {
    let prefix = targetLang.prefix;
    // remove trailing slash
    if (prefix.endsWith("/")) {
      prefix = prefix.slice(0, -1);
    }
    if (prefix === langField) {
      language = targetLang;
      pathname = url.pathname.slice(targetLang.prefix.length);
      break;
    }
  }
  const newUrl = new URL(url);
  newUrl.pathname = pathname;

  return {
    subdomain: subsiteIdentifier,
    language: language,
    pathname: pathname,
    url: newUrl.href,
  };
}

function getNewIssue(subsiteIdentifier, issueNumber) {
  const issueMap = {
    reddit: {
      1: "2020/47",
      2: "2020/48",
      3: "2020/49",
      4: "2020/50",
      5: "2020/51",
      6: "2020/52",
      7: "2020/53",
      8: "2020/53",
      9: "2021/1",
      10: "2021/2",
      11: "2021/3",
      12: "2021/5",
      13: "2021/6",
      14: "2021/7",
      15: "2021/8",
      16: "2021/9",
      17: "2021/10",
      18: "2021/11",
      19: "2021/12",
      20: "2021/13",
      21: "2021/14",
      22: "2021/15",
      23: "2021/16",
      24: "2021/17",
      25: "2021/18",
      26: "2021/19",
      27: "2021/20",
      28: "2021/21",
      29: "2021/22",
      30: "2021/23",
      31: "2021/24",
      32: "2021/25",
      33: "2021/26",
      34: "2021/27",
      35: "2021/28",
      36: "2021/29",
      37: "2021/30",
      38: "2021/31",
      39: "2021/32",
      40: "2021/33",
      41: "2021/34",
      42: "2021/35",
      43: "2021/36",
      44: "2021/37",
      45: "2021/38",
      46: "2021/39",
      47: "2021/40",
      48: "2021/41",
      49: "2021/42",
      50: "2021/43",
      51: "2021/44",
      52: "2021/45",
      53: "2021/46",
      54: "2021/47",
      55: "2021/48",
      56: "2021/49",
      57: "2021/50",
      58: "2021/51",
      59: "2022/5",
      60: "2022/5",
      61: "2022/6",
      62: "2022/7",
      63: "2022/8",
      64: "2022/9",
      65: "2022/10",
      66: "2022/11",
      67: "2022/12",
      68: "2022/13",
      69: "2022/14",
      70: "2022/15",
      71: "2022/16",
      72: "2022/17",
      73: "2022/18",
      74: "2022/19",
      75: "2022/20",
      76: "2022/21",
      77: "2022/22",
      78: "2022/23",
      79: "2022/24",
      80: "2022/25",
      81: "2022/26",
      82: "2022/27",
      83: "2022/28",
      84: "2022/29",
      85: "2022/30",
      86: "2022/31",
      87: "2022/32",
    },
  };

  if (issueMap[subsiteIdentifier]) {
    if (issueMap[subsiteIdentifier][issueNumber]) {
      return issueMap[subsiteIdentifier][issueNumber];
    }
  }

  return null;
}
