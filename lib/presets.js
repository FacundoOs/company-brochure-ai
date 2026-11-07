/**
 * Curated demo companies — only these URLs are allowed in production.
 * Add sites with server-rendered marketing HTML for best results.
 */
export const PRESETS = [
  {
    id: "huggingface",
    name: "Hugging Face",
    url: "https://huggingface.co",
    description: "Open-source AI platform and model hub",
    initial: "🤗",
    accent: "#ffbd59",
    tag: "AI / ML",
  },
  {
    id: "stripe",
    name: "Stripe",
    url: "https://stripe.com",
    description: "Payments infrastructure for the internet",
    initial: "S",
    accent: "#635bff",
    tag: "Fintech",
  },
  {
    id: "vercel",
    name: "Vercel",
    url: "https://vercel.com",
    description: "Frontend cloud platform for developers",
    initial: "▲",
    accent: "#ffffff",
    tag: "Developer tools",
  },
  {
    id: "facundoosores",
    name: "Facundo Osores",
    url: "https://facundoosores.com/",
    description: "Portafolio y proyectos personales",
    initial: "FO",
    accent: "#38bdf8",
    tag: "Portfolio",
  },
];

export function getPresetById(presetId) {
  return PRESETS.find((p) => p.id === presetId) ?? null;
}

export function isAllowedUrl(url) {
  return PRESETS.some((p) => p.url === url);
}
