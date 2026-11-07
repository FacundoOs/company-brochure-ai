import * as cheerio from "cheerio";
import { MAX_CONTENT_CHARS, FETCH_TIMEOUT_MS } from "./constants";

const USER_AGENT =
  "Mozilla/5.0 (compatible; CompanyBrochureAI/1.0; +https://github.com)";

/**
 * @param {string} url
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
      redirect: "follow",
    });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * @param {string} html
 * @returns {string}
 */
function extractText(html) {
  const $ = cheerio.load(html);
  const title = $("title").first().text().trim() || "No title found";

  const body = $("body");
  let bodyText = "";
  if (body.length) {
    body.find("script, style, img, input, noscript, svg").remove();
    bodyText = body.text().replace(/\s+/g, " ").trim();
  }

  const combined = bodyText ? `${title}\n\n${bodyText}` : title;
  return combined.slice(0, MAX_CONTENT_CHARS);
}

/**
 * @param {string} url
 * @returns {Promise<string>}
 */
export async function fetchWebsiteContents(url) {
  const response = await fetchWithTimeout(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }

  const html = await response.text();
  return extractText(html);
}

/**
 * @param {string} url
 * @returns {Promise<string[]>}
 */
export async function fetchWebsiteLinks(url) {
  const response = await fetchWithTimeout(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const links = [];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (href) links.push(href);
  });

  return links;
}
