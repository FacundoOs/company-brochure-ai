import BrochureGenerator from "@/components/BrochureGenerator";

const STEPS = [
  { num: "01", label: "Scrape", detail: "Live fetch + cheerio" },
  { num: "02", label: "Select", detail: "OpenAI picks pages (JSON)" },
  { num: "03", label: "Generate", detail: "OpenAI streams brochure" },
];

export default function Home() {
  return (
    <div className="page" id="top">
      <div className="bg-glow bg-glow-a" aria-hidden />
      <div className="bg-glow bg-glow-b" aria-hidden />

      <header className="site-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            CB
          </span>
          <span className="brand-name">Brochure AI</span>
        </div>
        <span className="demo-badge">Demo</span>
      </header>

      <section className="hero">
        <p className="eyebrow">LLM · Web scraping · Next.js</p>
        <h1>
          Company brochures,
          <br />
          <em>generated in seconds</em>
        </h1>
        <p className="hero-lead">
          Pick a company and read the model’s reasoning as it streams — which
          links matter, how it plans the brochure — then the final markdown
          output. Nothing is loaded from a file.
        </p>

        <ul className="pipeline" aria-label="How it works">
          {STEPS.map((step) => (
            <li key={step.num} className="pipeline-step">
              <span className="pipeline-num">{step.num}</span>
              <span className="pipeline-label">{step.label}</span>
              <span className="pipeline-detail">{step.detail}</span>
            </li>
          ))}
        </ul>
      </section>

      <BrochureGenerator />

      <footer className="site-footer">
        <p>
          Built by{" "}
          <a href="https://facundoosores.com" target="_blank" rel="noreferrer">
            Facundo Osores
          </a>
          {" · "}Portfolio demo — curated URLs only
        </p>
      </footer>
    </div>
  );
}
