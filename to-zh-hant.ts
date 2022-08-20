import { default as OpenCC } from "https://jspm.dev/opencc-js@1.0.4";
// @ts-ignore: npm module
const zhHansToZhHant = OpenCC.Converter({ from: "cn", to: "tw" });

export const toZhHant = (text: string): string => {
  // return text;
  return zhHansToZhHant(text);
};
