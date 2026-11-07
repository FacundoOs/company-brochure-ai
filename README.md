# Company Brochure AI

Generate short company brochures for prospective clients, investors, and recruits. Built as a portfolio project from an LLM engineering course exercise, ported to **Next.js (JavaScript)** with server-side scraping and OpenAI.

## How it works

1. **Scrape** the landing page and collect links (cheerio + fetch).
2. **Select** relevant pages with an LLM (about, careers, products).
3. **Fetch** up to 4 linked pages and build context (truncated).
4. **Stream** a markdown brochure to the browser.

## Demo mode (production-safe)

Only **4 curated companies** can be used — no arbitrary URL input:

- Hugging Face
- Stripe
- Vercel
- Edward Donner

Rate limit: **5 generations per IP per day** (in-memory; use Redis/Upstash for multi-instance deploys).

## Setup

```bash
cd ~/projects/company-brochure-ai
cp .env.local.example .env.local
# Add OPENAI_API_KEY to .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Required. Server-side only. |
| `OPENAI_MODEL_LINKS` | Optional. Default `gpt-4o-mini`. |
| `OPENAI_MODEL_BROCHURE` | Optional. Default `gpt-4o-mini`. |
| `RATE_LIMIT_PER_DAY` | Optional. Default `5`. |

## Deploy (Vercel)

1. Push repo to GitHub.
2. Import in Vercel, set `OPENAI_API_KEY`.
3. `maxDuration` is set to 60s on the brochure route for scraping + LLM.

## Project structure

```
app/
  api/brochure/route.js   # POST — stream brochure
  api/presets/route.js    # GET — list presets
  page.js                 # UI
components/
  BrochureGenerator.jsx
lib/
  scraper.js              # cheerio scraping
  openai.js               # orchestration
  prompts.js
  presets.js              # allowlist
  rate-limit.js
```

## Limitations

- Static HTML scraping only (no Playwright). SPAs and bot-protected sites may fail.
- Social / external links chosen by the model are skipped if fetch fails.
- In-memory rate limiting resets on cold starts; not suitable for high-traffic abuse without Redis.

## License

MIT
