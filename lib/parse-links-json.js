/**
 * Extract {"links": [...]} from model text (markdown fences, extra prose, etc.)
 * @param {string} raw
 * @returns {{ links: Array<{ type: string, url: string }> } | null}
 */
export function parseLinksJson(raw) {
  if (!raw?.trim()) return null;

  let text = raw.trim();

  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    if (parsed?.links && Array.isArray(parsed.links)) {
      return parsed;
    }
  } catch {
    /* try next strategy below */
  }

  return null;
}

/**
 * @param {string} fullText
 * @param {string} delimiter
 */
export function extractAfterDelimiter(fullText, delimiter) {
  const idx = fullText.indexOf(delimiter);
  if (idx === -1) return "";
  return fullText.slice(idx + delimiter.length);
}
