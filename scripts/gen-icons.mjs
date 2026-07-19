// Generates PWA/Play-Store PNG icons by rendering an SVG with the pre-installed
// Chromium. Run: node scripts/gen-icons.mjs
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("public/icons");
fs.mkdirSync(OUT, { recursive: true });

const executablePath = fs.existsSync(
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
)
  ? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
  : undefined;

// star path drawn centered in a 100x100 viewBox
const star = (scale) => `
  <svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    <path fill="#ffffff" transform="translate(50 50) scale(${scale}) translate(-50 -50)"
      d="M50 12 L58 42 L88 50 L58 58 L50 88 L42 58 L12 50 L42 42 Z"/>
  </svg>`;

function html({ size, rounded, maskable }) {
  const radius = rounded ? Math.round(size * 0.22) : 0;
  // maskable icons must keep content within the central ~80% safe zone.
  const scale = maskable ? 0.62 : 0.82;
  return `<!doctype html><html><head><style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:${size}px;height:${size}px}
    .box{width:${size}px;height:${size}px;border-radius:${radius}px;overflow:hidden;
      background:linear-gradient(135deg,#7c5cff,#00d6b4);display:flex;align-items:center;justify-content:center}
    .star{width:${size}px;height:${size}px}
  </style></head><body>
    <div class="box"><div class="star">${star(scale)}</div></div>
  </body></html>`;
}

const targets = [
  { file: "icon-192.png", size: 192, rounded: true, maskable: false },
  { file: "icon-512.png", size: 512, rounded: true, maskable: false },
  { file: "icon-maskable-192.png", size: 192, rounded: false, maskable: true },
  { file: "icon-maskable-512.png", size: 512, rounded: false, maskable: true },
  { file: "apple-touch-icon.png", size: 180, rounded: true, maskable: false },
];

const browser = await chromium.launch({ executablePath });
const page = await browser.newPage();
for (const t of targets) {
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(html(t), { waitUntil: "networkidle" });
  const el = await page.$("body");
  await el.screenshot({ path: path.join(OUT, t.file), omitBackground: false });
  console.log("wrote", t.file);
}
await browser.close();
