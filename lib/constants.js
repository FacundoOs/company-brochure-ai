export const MAX_CONTENT_CHARS = 2000;
export const MAX_CONTEXT_CHARS = 5000;
export const MAX_LINKS_TO_FETCH = 4;
export const FETCH_TIMEOUT_MS = 10000;

export const MODEL_LINKS =
  process.env.OPENAI_MODEL_LINKS || "gpt-4o-mini";
export const MODEL_BROCHURE =
  process.env.OPENAI_MODEL_BROCHURE || "gpt-4o-mini";

export const RATE_LIMIT_PER_DAY = parseInt(
  process.env.RATE_LIMIT_PER_DAY || "5",
  10
);
