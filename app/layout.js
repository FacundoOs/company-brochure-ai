import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL("https://company-brochure-ai.vercel.app"),
  title: "Company Brochure AI | LLM-Powered Website to PDF Generator",
  description:
    "Generate short company brochures from curated websites using LLM-powered web scraping. Automatically extracts key information, selects relevant pages, and creates professional marketing materials for potential clients, investors, and recruits.",
  keywords: [
    "AI brochure generator",
    "company profile",
    "marketing automation",
    "LLM document generation",
    "web scraping",
    "OpenAI",
  ],
  authors: [{ name: "Facundo Osores", url: "https://facundoosores.com/" }],
  robots: { index: true, follow: true },
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", rel: "icon" },
      { url: "/favicon.svg", type: "image/svg+xml", rel: "icon" },
    ],
    apple: [{ url: "/favicons/apple-touch-icon.png" }],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Company Brochure AI",
    title: "Company Brochure AI | LLM-Powered Website to PDF Generator",
    description:
      "Generate polished company brochures from live websites using LLM reasoning and web scraping.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Company Brochure AI - LLM-Powered Website to PDF Generator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Company Brochure AI",
    description:
      "Generate polished company brochures from live websites using LLM reasoning and web scraping.",
    images: ["/og-image.png"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 4,
  themeColor: "#0b1020",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${fraunces.variable}`}>
      <head>
        <meta name="apple-mobile-web-app-title" content="Brochure AI" />
        <meta name="application-name" content="Company Brochure AI" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/favicons/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body>{children}</body>
    </html>
  );
}
