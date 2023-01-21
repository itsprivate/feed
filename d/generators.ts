import { generateId, generateTimestamp } from "./hacks.ts";
import {
  AUTO,
  SourceLanguage,
  SUPPORTED_FORMALITY_TONES,
  TargetLanguage,
} from "./settings.ts";
import { Chunk, SplitedSentence } from "./extractors.ts";

let id = 1;
export function generateSplitSentencesRequestData(
  text: string[],
  sourceLanguage: SourceLanguage = AUTO,
  identifier = generateId(),
) {
  return {
    jsonrpc: "2.0",
    method: "LMT_split_text",
    params: {
      commonJobParams: { "mode": "translate" },
      lang: {
        lang_user_selected: sourceLanguage,
        user_preferred_langs: [],
      },
      texts: text,
    },
    id: identifier,
  };
}
export interface JobSentence {
  id: number;
  text: string;
  prefix: string;
}

export interface Job {
  kind: "default";
  _index?: number;
  // raw_en_sentence: string;
  sentences: JobSentence[];
  raw_en_context_before: string[];
  raw_en_context_after: string[];
  preferred_num_beams: number;
}

export function generateJobs(sentences: SplitedSentence[], beams = 1) {
  const jobs: Job[] = [];
  let id = 0;
  for (let i = 0; i < sentences.length; i++) {
    const chunks = sentences[i].chunks;
    for (let j = 0; j < chunks.length; j++) {
      const chunk = chunks[j];
      jobs.push({
        kind: "default",
        _index: i,
        // raw_en_sentence: sentence,
        sentences: [{
          id: id,
          text: chunk.sentences[0].text,
          prefix: chunk.sentences[0].prefix,
        }],
        raw_en_context_before: chunks.slice(0, id).map((chunk) =>
          chunk.sentences[0].text
        ),
        raw_en_context_after: (id + 1) < chunks.length
          ? [chunks[id + 1].sentences[0].text]
          : [],
        preferred_num_beams: beams,
      });
      id++;
    }
  }
  return jobs;
}

export function splitedResultToArray(
  sentences: SplitedSentence[],
): string[] {
  return sentences.reduce<string[]>((jobs, sentence) => {
    const chunks = sentence.chunks;
    for (const chunk of chunks) {
      jobs.push(chunk.sentences[0].text);
    }
    return jobs;
  }, []);
}
function generateCommonJobParams(formality?: "formal" | "informal") {
  if (!formality) {
    return {};
  }

  if (!SUPPORTED_FORMALITY_TONES.includes(formality)) {
    throw new Error("Formality tone '{formality_tone}' not supported.");
  }
  return { formality };
}

export function generateTranslationRequestData(
  sourceLanguage: SourceLanguage,
  targetLanguage: TargetLanguage,
  sentences: SplitedSentence[],
  identifier = generateId(),
  alternatives = 1,
  formality?: "formal" | "informal",
) {
  const allSentences = splitedResultToArray(sentences);
  // every job has max 15 sentence

  // split allSentences in job groups of 15

  return {
    jsonrpc: "2.0",
    method: "LMT_handle_jobs",
    params: {
      jobs: generateJobs(sentences, alternatives),
      lang: {
        user_preferred_langs: [targetLanguage, sourceLanguage],
        source_lang_computed: sourceLanguage,
        target_lang: targetLanguage,
      },
      priority: 1,
      commonJobParams: generateCommonJobParams(formality),
      timestamp: generateTimestamp(splitedResultToArray(sentences)),
    },
    id: identifier,
  };
}
