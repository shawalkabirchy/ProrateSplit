import type { Metadata, Viewport } from "next";
import Script from "next/script";

/*
  The marketing site's own root layout. It loads the taste-skill kit (public/assets) and never the
  workspace's Tailwind CSS; /app/ has its own root layout, so moving between them is a full page
  load and neither stylesheet reaches the other page.
*/

export const metadata: Metadata = {
  title: "ProrateSplit — A fair split. Down to the day.",
  description:
    "Free bill splitter for shared homes. Split each bill by the days everyone lived there or in equal shares, and see who owes whom. No account; data stays in your browser.",
  other: { "page-type": "software", "site-kind": "software" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/* the :root block exactly as `start.mjs brand --page software --bg #ffffff --ink #182239
   --accent #4263eb --type outfit --radius soft` printed it (taste-skill 2.5); the fonts are
   self-hosted in public/fonts instead of the printed Google Fonts link */
const palette = `
:root {
  --p-bg: #ffffff; --p-surface: #f2f3f4; --p-ink: #182239; --p-muted: #666e80;
  --p-accent: #4263eb; --p-accent-ink: #ffffff; --p-action: #4263eb; --p-action-ink: #ffffff;
  --p-inv-bg: #182239; --p-inv-surface: #252f45; --p-inv-ink: #ffffff; --p-inv-muted: #9ea4af;
  --p-inv-accent: #ffffff; --p-inv-accent-ink: #182239; --p-inv-action: #ffffff; --p-inv-action-ink: #182239;
  --font-display: "Outfit", system-ui, sans-serif;
  --font-text: "Outfit", system-ui, sans-serif;
  --font-mono: "DM Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  --display-weight: 400;
  --display-tracking: -0.03em;
  --display-tracking-xl: -0.04em;
}`;

const sheets = [
  "/fonts/fonts.css",
  "/assets/system.css",
  "/assets/ui/cards.css",
  "/assets/motion/motion.css",
  "/assets/backgrounds/backgrounds.css",
  "/assets/layout/layout.css",
  "/assets/icons/icon.css",
  "/assets/ui/base.css",
  "/assets/ui/window/fragment.css",
  "/assets/ui/calendar/fragment.css",
  "/assets/ui/checklist/fragment.css",
  "/assets/ui/toggles/fragment.css",
  "/assets/ui/notify/fragment.css",
  "/assets/ui/files/fragment.css",
  "/assets/site.css",
];

const modules = [
  "/assets/system.js",
  "/assets/motion/motion.js",
  "/assets/layout/layout.js",
];

export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-type="software"
      data-radius="soft"
      data-ground="sage"
      data-buttons="solid"
      data-motion=""
      suppressHydrationWarning
    >
      <head>
        {sheets.map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
        <style>{palette}</style>
        {/* the grounds' page tokens before the first paint: plain, not deferred (backgrounds.md) */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/assets/backgrounds/backgrounds.js" />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "document.documentElement.classList.add('mo-js');setTimeout(function(){document.documentElement.classList.add('mo-safe')},2500)",
          }}
        />
      </head>
      <body>
        {children}
        {modules.map((src) => (
          <Script key={src} src={src} type="module" strategy="afterInteractive" />
        ))}
      </body>
    </html>
  );
}
