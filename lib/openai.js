import OpenAI from "openai";
import {
  MODEL_LINKS,
  MODEL_BROCHURE,
  MAX_CONTEXT_CHARS,
  MAX_LINKS_TO_FETCH,
} from "./constants";
import {
  LINK_ANALYSIS_SYSTEM,
  BROCHURE_PLANNING_SYSTEM,
  LINKS_JSON_DELIMITER,
  BROCHURE_DELIMITER,
  buildLinksUserPrompt,
  buildBrochureUserPrompt,
} from "./prompts";
import { parseLinksJson, extractAfterDelimiter } from "./parse-links-json";
import { createStreamSplitter } from "./stream-splitter";
import { fetchWebsiteContents, fetchWebsiteLinks } from "./scraper";

/**
 * @param {string} baseUrl
 * @param {string} linkUrl
 */
function isSameSite(baseUrl, linkUrl) {
  try {
    const base = new URL(baseUrl);
    const link = new URL(linkUrl, baseUrl);
    return link.hostname === base.hostname;
  } catch {
    return false;
  }
}

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return new OpenAI({ apiKey });
}

/**
 * Reliable JSON link pick when streaming format fails.
 * @param {import("openai").OpenAI} client
 * @param {string} url
 * @param {string[]} rawLinks
 */
async function selectLinksFallback(client, url, rawLinks) {
  const response = await client.chat.completions.create({
    model: MODEL_LINKS,
    messages: [
      {
        role: "system",
        content: `You pick website links for a company brochure. Respond with JSON only:
{"links": [{"type": "about page", "url": "https://example.com/about"}]}
Use full https URLs on the same site as the user URL. Max ${MAX_LINKS_TO_FETCH} links.
Exclude privacy, terms, cookies, login, mailto, tel.`,
      },
      { role: "user", content: buildLinksUserPrompt(url, rawLinks) },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content ?? "";
  const parsed = parseLinksJson(content);
  if (!parsed) {
    throw new Error("Could not parse link selection from model");
  }
  return parsed;
}

/**
 * @param {import("openai").OpenAI} client
 * @param {string} url
 * @param {string[]} rawLinks
 */
async function* streamLinkSelection(client, url, rawLinks) {
  const stream = await client.chat.completions.create({
    model: MODEL_LINKS,
    messages: [
      { role: "system", content: LINK_ANALYSIS_SYSTEM },
      { role: "user", content: buildLinksUserPrompt(url, rawLinks) },
    ],
    stream: true,
  });

  const splitter = createStreamSplitter(LINKS_JSON_DELIMITER);
  let jsonBuffer = "";
  let fullText = "";

  yield { type: "thinking", id: "links", phase: "start", model: MODEL_LINKS };

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content;
    if (!text) continue;

    fullText += text;

    for (const ev of splitter.processChunk(text)) {
      if (ev.type === "thinking") {
        yield { type: "thinking", id: "links", chunk: ev.chunk };
      } else {
        jsonBuffer += ev.chunk;
      }
    }
  }

  if (!splitter.isOutputPhase()) {
    const tail = splitter.flushThinking();
    if (tail) yield { type: "thinking", id: "links", chunk: tail };
  } else {
    jsonBuffer += splitter.flushOutput();
  }

  yield { type: "thinking", id: "links", phase: "end" };

  let parsed =
    parseLinksJson(jsonBuffer) ||
    parseLinksJson(extractAfterDelimiter(fullText, LINKS_JSON_DELIMITER)) ||
    parseLinksJson(fullText);

  if (!parsed) {
    yield {
      type: "thinking",
      id: "links",
      chunk:
        "\n\n---\n*The streamed reply did not include valid link JSON. Running a structured follow-up call…*\n",
    };
    parsed = await selectLinksFallback(client, url, rawLinks);
  }

  return parsed;
}

/**
 * @param {import("openai").OpenAI} client
 * @param {string} userPrompt
 */
async function* streamBrochureWithPlanning(client, userPrompt) {
  const stream = await client.chat.completions.create({
    model: MODEL_BROCHURE,
    messages: [
      { role: "system", content: BROCHURE_PLANNING_SYSTEM },
      { role: "user", content: userPrompt },
    ],
    stream: true,
  });

  const splitter = createStreamSplitter(BROCHURE_DELIMITER);
  let fullText = "";
  let brochureStarted = false;

  yield { type: "thinking", id: "brochure", phase: "start", model: MODEL_BROCHURE };

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content;
    if (!text) continue;

    fullText += text;

    for (const ev of splitter.processChunk(text)) {
      if (ev.type === "thinking") {
        yield { type: "thinking", id: "brochure", chunk: ev.chunk };
      } else {
        brochureStarted = true;
        yield { type: "brochure", chunk: ev.chunk };
      }
    }
  }

  if (!splitter.isOutputPhase()) {
    const tail = splitter.flushThinking();
    if (tail) {
      yield { type: "thinking", id: "brochure", chunk: tail };
    }
    // Model skipped delimiter — treat remainder as brochure so the run still completes
    if (!brochureStarted && fullText.trim()) {
      yield {
        type: "thinking",
        id: "brochure",
        chunk:
          "\n\n---\n*No brochure delimiter detected; showing full model output as the brochure.*\n\n",
      };
      yield { type: "brochure", chunk: fullText };
    }
  } else {
    const tail = splitter.flushOutput();
    if (tail) yield { type: "brochure", chunk: tail };
  }

  yield { type: "thinking", id: "brochure", phase: "end" };
}

/**
 * @param {string} companyName
 * @param {string} url
 */
export async function* runBrochurePipeline(companyName, url) {
  const client = getClient();

  yield {
    type: "step",
    id: "discover",
    phase: "start",
    title: "Scrape",
    detail: url,
  };

  const rawLinks = await fetchWebsiteLinks(url);

  yield {
    type: "step",
    id: "discover",
    phase: "done",
    detail: `${rawLinks.length} links`,
    data: { count: rawLinks.length },
  };

  yield { type: "step", id: "landing", phase: "start", title: "Scrape", detail: "Homepage" };

  const landing = await fetchWebsiteContents(url);

  yield {
    type: "step",
    id: "landing",
    phase: "done",
    detail: `${landing.length.toLocaleString()} chars`,
    data: { chars: landing.length },
  };

  const linkGen = streamLinkSelection(client, url, rawLinks);
  let linkIterResult = await linkGen.next();

  while (!linkIterResult.done) {
    yield linkIterResult.value;
    linkIterResult = await linkGen.next();
  }

  const linkResult = linkIterResult.value;

  const sameSite = linkResult.links.filter(
    (l) => l.url && isSameSite(url, l.url)
  );
  const toFetch = sameSite.slice(0, MAX_LINKS_TO_FETCH);

  yield {
    type: "step",
    id: "select-links",
    phase: "done",
    title: "Fetch pages",
    detail: `${toFetch.length} URLs`,
    data: { chosen: toFetch.map((l) => ({ type: l.type, url: l.url })) },
  };

  let context = `## Landing Page:\n\n${landing}\n## Relevant Links:\n`;

  for (let i = 0; i < toFetch.length; i++) {
    const link = toFetch[i];
    const stepId = `page-${i}`;

    yield {
      type: "step",
      id: stepId,
      phase: "start",
      title: "Scrape",
      detail: link.url,
    };

    try {
      const pageContent = await fetchWebsiteContents(link.url);
      context += `\n\n### Link: ${link.type}\n${pageContent}`;
      yield {
        type: "step",
        id: stepId,
        phase: "done",
        detail: `${pageContent.length.toLocaleString()} chars`,
      };
    } catch {
      context += `\n\n### Link: ${link.type}\n[Could not fetch]\n`;
      yield { type: "step", id: stepId, phase: "error", detail: "Failed" };
    }
  }

  const userPrompt = buildBrochureUserPrompt(companyName, context).slice(
    0,
    MAX_CONTEXT_CHARS
  );

  yield* streamBrochureWithPlanning(client, userPrompt);

  yield { type: "done" };
}
