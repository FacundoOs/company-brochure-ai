/**
 * Splits a streamed LLM response at a delimiter: thinking (before) vs output (after).
 */
export function createStreamSplitter(delimiter) {
  let phase = "thinking";
  let holdback = "";

  /**
   * @param {string} text
   * @returns {Array<{ type: 'thinking' | 'output', chunk: string }>}
   */
  function processChunk(text) {
    const events = [];

    if (phase === "output") {
      if (text) events.push({ type: "output", chunk: text });
      return events;
    }

    holdback += text;
    const idx = holdback.indexOf(delimiter);

    if (idx === -1) {
      let safeEnd = holdback.length;
      for (let i = 1; i < delimiter.length && i <= holdback.length; i++) {
        if (delimiter.startsWith(holdback.slice(-i))) {
          safeEnd = holdback.length - i;
          break;
        }
      }
      const emit = holdback.slice(0, safeEnd);
      holdback = holdback.slice(safeEnd);
      if (emit) events.push({ type: "thinking", chunk: emit });
      return events;
    }

    const thinkPart = holdback.slice(0, idx);
    if (thinkPart) events.push({ type: "thinking", chunk: thinkPart });

    holdback = holdback.slice(idx + delimiter.length);
    phase = "output";

    if (holdback) {
      events.push({ type: "output", chunk: holdback });
      holdback = "";
    }

    return events;
  }

  /** @returns {string} */
  function flushThinking() {
    if (phase !== "thinking" || !holdback) return "";
    const rest = holdback;
    holdback = "";
    return rest;
  }

  /** @returns {string} */
  function flushOutput() {
    const rest = holdback;
    holdback = "";
    return rest;
  }

  function isOutputPhase() {
    return phase === "output";
  }

  return { processChunk, flushThinking, flushOutput, isOutputPhase };
}
