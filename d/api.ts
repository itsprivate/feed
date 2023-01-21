import {
  extractSplitSentences,
  SplittedSentences,
  TranslatedSentences,
} from "./extractors.ts";
import {
  generateSplitSentencesRequestData,
  generateTranslationRequestData,
} from "./generators.ts";
import { API_URL, AUTO, SourceLanguage, TargetLanguage } from "./settings.ts";
import { abbreviateLanguage } from "./utils.ts";

interface RequestOptions extends RequestInit {
  url: string;
}
const request = function (options: RequestOptions) {
  return fetch(options.url, options).then((response) => {
    return response.json();
  });
};

const headers = {
  Accept: "*/*",
  "Accept-Language": "en-US;q=0.8,en;q=0.7",
  Authority: "www2.deepl.com",
  "Content-Type": "application/json",
  Origin: "https://www.deepl.com",
  Referer: "https://www.deepl.com/translator",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-site",
};

function stringifyJson(object: unknown): string {
  return JSON.stringify(object).replace('"method":"', () => {
    const self = object as { id: number };
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    if ((self.id + 3) % 13 === 0 || (self.id + 5) % 29 === 0) {
      return '"method" : "';
    }
    return '"method": "';
  });
}

export async function splitSentences(
  text: string[],
  sourceLanguage?: SourceLanguage,
  identifier?: number,
) {
  const data = generateSplitSentencesRequestData(
    text,
    sourceLanguage,
    identifier,
  );
  return await request(
    {
      method: "POST",
      url: API_URL + "?method=LMT_split_text",
      headers,
      body: stringifyJson(data),
    },
  );
}

export async function splitIntoSentences(
  text: string[],
  sourceLanguage?: SourceLanguage,
  identifier?: number,
) {
  return extractSplitSentences(
    await splitSentences(text, sourceLanguage, identifier) as SplittedSentences,
  );
}
export interface TranslationResult {
  text: string[];
  from: SourceLanguage;
  to: TargetLanguage;
}

export async function requestTranslation(
  text: string[],
  targetLanguage: TargetLanguage,
  sourceLanguage: SourceLanguage,
  identifier?: number,
  alternatives?: number,
  formalityTone?: "formal" | "informal",
): Promise<TranslationResult> {
  const splitResult = await splitSentences(
    text,
    sourceLanguage,
    identifier,
  ) as SplittedSentences;
  const data = generateTranslationRequestData(
    sourceLanguage === "auto"
      ? splitResult.result.lang.detected
      : sourceLanguage,
    targetLanguage,
    extractSplitSentences(splitResult),
    identifier,
    alternatives,
    formalityTone,
  );
  const jobsIndexes = data.params.jobs.map((job) => job._index);

  // format data, remove _index
  data.params.jobs = data.params.jobs.map((job) => {
    const newJob = { ...job };
    delete newJob._index;
    return newJob;
  });
  const response = await request({
    method: "POST",
    url: API_URL + "?method=LMT_handle_jobs",
    body: stringifyJson(data),
    headers: headers,
  }) as TranslatedSentences;

  // merge to text
  const finalResult: TranslationResult = {
    from: splitResult.result.lang.detected,
    to: targetLanguage,
    text: [],
  };
  response.result.translations.forEach((translation, index) => {
    const jobIndex = jobsIndexes[index]!;
    if (finalResult.text[jobIndex] === undefined) {
      finalResult.text[jobIndex] = "";
    }
    const originalSentencePrefix = data.params.jobs[index].sentences[0].prefix;

    const originalSentencePre = data.params.jobs[index].sentences[0].prefix;
    finalResult.text[jobIndex] = finalResult.text[jobIndex] +
      originalSentencePrefix + translation.beams[0].sentences[0].text;
  });

  return finalResult;
}

export async function translate(
  text: string[],
  targetLanguage: TargetLanguage,
  sourceLanguage: SourceLanguage = AUTO,
  identifier?: number,
  alternatives?: number,
  formalityTone?: "formal" | "informal",
): Promise<TranslationResult> {
  if (!text) {
    return {
      text: [],
      from: sourceLanguage,
      to: targetLanguage,
    };
  }
  if (text && text.length === 1) {
    if (text[0] === "") {
      return {
        text: [""],
        from: sourceLanguage,
        to: (targetLanguage),
      };
    }
  }
  const response = requestTranslation(
    text,
    abbreviateLanguage(targetLanguage)!,
    abbreviateLanguage(sourceLanguage) ?? "auto",
    identifier,
    alternatives,
    formalityTone,
  );

  return response;
}
