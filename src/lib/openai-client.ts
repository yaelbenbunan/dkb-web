import OpenAI from "openai";

let cached: OpenAI | null = null;
let cachedForKey: string | undefined = undefined;

export function getOpenAIClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    cached = null;
    cachedForKey = undefined;
    return null;
  }
  if (cached && cachedForKey === key) return cached;
  cached = new OpenAI({ apiKey: key });
  cachedForKey = key;
  return cached;
}
