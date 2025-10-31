async function main() {
  const a = await fetch(
    "https://news.google.com/rss/topics/CAAqIggKIhxDQkFTRHdvSkwyMHZNR1F3TlhjekVnSmxiaWdBUAE?hl=en-US&gl=US&ceid=US%3Aen",
    {
      headers: {
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "zh-CN,zh;q=0.9",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=0, i",
        "sec-ch-ua": '"Chromium";v="141", "Not?A_Brand";v="8"',
        "sec-ch-ua-arch": '"arm"',
        "sec-ch-ua-bitness": '"64"',
        "sec-ch-ua-form-factors": '"Desktop"',
        "sec-ch-ua-full-version": '"141.0.7390.122"',
        "sec-ch-ua-full-version-list":
          '"Chromium";v="141.0.7390.122", "Not?A_Brand";v="8.0.0.0"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-model": '""',
        "sec-ch-ua-platform": '"macOS"',
        "sec-ch-ua-platform-version": '"26.0.1"',
        "sec-ch-ua-wow64": "?0",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
      },
      body: null,
      method: "GET",
      mode: "cors",
      credentials: "include",
    },
  );
  const res = await a.text();
  console.log(res);
}
main();
