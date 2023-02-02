import { getGoogleNewsRedirectUrlByBody } from "./googlenews.ts";
import { assertEquals } from "../deps.ts";

Deno.test("googlenews adapter", () => {
  const body =
    `<body class="y0K44d quxSkb"></body><c-wiz jsrenderer="lW1Lhc" class="jtabgf" data-n-au="https://apnews.com/article/russia-ukraine-kyiv-politics-government-european-union-30925e2a28638d1fb971b64d10acd6f8" data-n-zris="1" data-n-ziab="1" jsshadow jsdata="deferred-i1" data-p="%.@.[[&quot;en-US&quot;,&quot;US&quot;,[&quot;SPORTS_FULL_COVERAGE&quot;,&quot;WEB_TEST_1_0_0&quot;],null,[],1,1,&quot;US:en&quot;,null,null,null,null,null,null,null,false,5],&quot;en-US&quot;,&quot;US&quot;,true,[2,4,28],1,true,&quot;506422671&quot;,false,false,null,false],&quot;CBMicmh0dHBzOi8vYXBuZXdzLmNvbS9hcnRpY2xlL3J1c3NpYS11a3JhaW5lLWt5aXYtcG9saXRpY3MtZ292ZXJubWVudC1ldXJvcGVhbi11bmlvbi0zMDkyNWUyYTI4NjM4ZDFmYjk3MWI2NGQxMGFjZDZmONIBAA&quot;,1,1]" jscontroller="he6YWd" jsaction="rcuQ6b:npT2md" data-node-index="0;0" jsmodel="hc6Ubd" view c-wiz>Opening <a href="https://apnews.com/article/russia-ukraine-kyiv-politics-government-european-union-30925e2a28638d1fb971b64d10acd6f8" jsname="tljFtd" rel="nofollow">https://apnews.com/article/russia-ukraine-kyiv-politics-government-european-union-30925e2a28638d1fb971b64d10acd6f8</a><c-data id="i1" jsdata=" SVrtBe;_;1"></c-data></c-wiz>`;

  const url = getGoogleNewsRedirectUrlByBody(body);
  assertEquals(
    url,
    "https://apnews.com/article/russia-ukraine-kyiv-politics-government-european-union-30925e2a28638d1fb971b64d10acd6f8",
  );
});
