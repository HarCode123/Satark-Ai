/**
 * translate.ts
 *
 * Single entry point for translation in the application.
 * The rest of the app ONLY calls translateToArabic() / translateToEnglish().
 * No component should ever know which provider is used underneath.
 *
 * Current provider: MyMemory Translation API
 *   - Free, no API key, CORS-enabled (works directly from the browser)
 *   - https://mymemory.translated.net/doc/spec.php
 *
 * To switch to Azure Translator later:
 *   1. Implement a new object matching the `TranslationProvider` interface below
 *      (e.g. azureProvider.ts) that calls the Azure endpoint.
 *   2. Change the single `activeProvider` assignment near the bottom of this file.
 *   Nothing else in the app changes.
 */

type LangCode = "en" | "ar";

interface TranslationProvider {
  translateText(
    text: string,
    source: LangCode,
    target: LangCode
  ): Promise<string>;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MYMEMORY_ENDPOINT = "https://api.mymemory.translated.net/get";

// Optional: set VITE_MYMEMORY_EMAIL in a .env file to raise the free quota
// from 5,000 to 50,000 words/day. Not required to run the app.
const CONTACT_EMAIL = (import.meta as any).env.VITE_MYMEMORY_EMAIL as string | undefined;

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 400;

// MyMemory's practical safe limit per request is ~500 characters.
// We chunk under that to stay reliable.
const MAX_CHUNK_LENGTH = 450;

// Simple in-memory cache to avoid re-translating the same string
// (also protects against duplicate calls from React StrictMode / re-renders).
const cache = new Map<string, string>();

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Splits long text into chunks safe for MyMemory's request size limits.
 * Tries to split on sentence boundaries first, falls back to word boundaries.
 */
function chunkText(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text];

  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + sentence).length <= maxLength) {
      current += sentence;
      continue;
    }

    if (current) chunks.push(current.trim());

    if (sentence.length <= maxLength) {
      current = sentence;
    } else {
      // Sentence itself too long — hard split on words.
      const words = sentence.split(" ");
      let wordChunk = "";
      for (const word of words) {
        if ((wordChunk + " " + word).trim().length <= maxLength) {
          wordChunk = (wordChunk + " " + word).trim();
        } else {
          chunks.push(wordChunk);
          wordChunk = word;
        }
      }
      current = wordChunk;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

/**
 * Fetch with a timeout, since `fetch` has no built-in timeout support.
 */
async function fetchWithTimeout(
  url: string,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

// ---------------------------------------------------------------------------
// MyMemory provider
// ---------------------------------------------------------------------------

interface MyMemoryResponse {
  responseData: { translatedText: string };
  responseStatus: number | string;
  responseDetails?: string;
}

async function translateChunkWithMyMemory(
  text: string,
  source: LangCode,
  target: LangCode
): Promise<string> {
  const params = new URLSearchParams({
    q: text,
    langpair: `${source}|${target}`,
  });

  if (CONTACT_EMAIL) {
    params.set("de", CONTACT_EMAIL);
  }

  const url = `${MYMEMORY_ENDPOINT}?${params.toString()}`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(url, REQUEST_TIMEOUT_MS);

      if (!response.ok) {
        throw new Error(`MyMemory HTTP error (${response.status})`);
      }

      const data: MyMemoryResponse = await response.json();

      // MyMemory returns HTTP 200 even for some errors, encoding the
      // real status inside the JSON body.
      const status = Number(data.responseStatus);
      const translated = data.responseData?.translatedText ?? "";

      if (status !== 200) {
        throw new Error(
          `MyMemory returned an error status (${data.responseStatus}): ${
            data.responseDetails ?? "unknown error"
          }`
        );
      }

      if (/MYMEMORY WARNING/i.test(translated)) {
        throw new Error(
          "MyMemory daily free quota exceeded. Try again later or set VITE_MYMEMORY_EMAIL to raise the limit."
        );
      }

      if (!translated) {
        throw new Error("MyMemory returned an empty translation.");
      }

      return translated;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry on quota/warning errors — retrying won't help.
      if (/quota exceeded/i.test(lastError.message)) {
        throw lastError;
      }

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_BASE_DELAY_MS * (attempt + 1));
      }
    }
  }

  throw new Error(
    `Translation request failed after ${MAX_RETRIES + 1} attempts: ${
      lastError?.message ?? "unknown error"
    }`
  );
}

const myMemoryProvider: TranslationProvider = {
  async translateText(text, source, target) {
    const trimmed = text.trim();
    if (!trimmed) return "";

    const cacheKey = `${source}:${target}:${trimmed}`;
    const cached = cache.get(cacheKey);
    if (cached !== undefined) return cached;

    const chunks = chunkText(trimmed, MAX_CHUNK_LENGTH);

    const translatedChunks: string[] = [];
    for (const chunk of chunks) {
      // Sequential to stay well under MyMemory's rate limits.
      const translated = await translateChunkWithMyMemory(
        chunk,
        source,
        target
      );
      translatedChunks.push(translated);
    }

    const result = translatedChunks.join(" ").trim();
    cache.set(cacheKey, result);
    return result;
  },
};

// ---------------------------------------------------------------------------
// Active provider
// ---------------------------------------------------------------------------
// To migrate to Azure Translator later, implement `TranslationProvider`
// in a new file (e.g. azureProvider.ts) and swap this one line:
const activeProvider: TranslationProvider = myMemoryProvider;

// ---------------------------------------------------------------------------
// Public API — this is the ONLY thing the rest of the app should import.
// ---------------------------------------------------------------------------

export async function translateToArabic(text: string): Promise<string> {
  try {
    return await activeProvider.translateText(text, "en", "ar");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`English → Arabic translation failed: ${message}`);
  }
}

export async function translateToEnglish(text: string): Promise<string> {
  try {
    return await activeProvider.translateText(text, "ar", "en");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Arabic → English translation failed: ${message}`);
  }
}