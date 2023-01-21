import { SourceLanguage } from "./settings.ts";

export interface TranslatedSentences {
  result: {
    lang: SourceLanguage;
    translations: Array<{
      beams: Array<{
        sentences: Array<{
          text: string;
        }>;
      }>;
    }>;
  };
}

export interface ChunkSentence {
  text: string;
  prefix: string;
}
export interface Chunk {
  sentences: ChunkSentence[];
}
export interface SplitedSentence {
  chunks: Chunk[];
}
export interface SplittedSentences {
  result: {
    lang: {
      detected: SourceLanguage;
    };
    texts: SplitedSentence[];
  };
}

export function extractSplitSentences(
  response: SplittedSentences,
): SplitedSentence[] {
  // return response.result.splitted_texts[0];
  return response.result.texts;
}
