const fs = require("fs");
const path = require("path");
const { Resvg } = require("@resvg/resvg-js");

// ==========================================
// HEADLINE CARD
// Builds a 1080x1080 branded image from the post headline.
// Used when no AI image is available (e.g. Gemini free-tier limits).
// ==========================================

const SIZE = 1080;
const MARGIN = 110;
const TEXT_WIDTH = SIZE - MARGIN * 2;
const MAX_LINES = 7;
const FONT_FAMILY = "Segoe UI, Inter, Arial, Helvetica, sans-serif";

// The sun logo shipped with the frontend (optional: the card still works without it)
const ASSETS_DIR = path.join(__dirname, "..", "frontend", "src", "assets");


function escapeXml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// Reads one logo SVG, gives its gradient a unique id (so two logos can share
// one image) and positions it inside the card
function logoPart(file, suffix, x, y, size) {
    try {
        return fs
            .readFileSync(path.join(ASSETS_DIR, file), "utf8")
            .replace(/<\?xml[^>]*\?>/, "")
            .replace(/<metadata[\s\S]*?<\/metadata>/g, "") // drop embedded provenance metadata
            .replace(/id="g"/g, `id="g-${suffix}"`)
            .replace(/url\(#g\)/g, `url(#g-${suffix})`)
            .replace(
                /<svg[^>]*>/,
                `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 96 96">`
            );
    } catch {
        return "";
    }
}

function sunLogo(prefix, x, y, size) {
    return (
        logoPart("sun-rays.svg", `${prefix}-rays`, x, y, size) +
        logoPart("sun-core.svg", `${prefix}-core`, x, y, size)
    );
}

function wrapText(text, maxChars) {
    const words = String(text).replace(/\s+/g, " ").trim().split(" ");
    const lines = [];
    let line = "";

    for (const word of words) {
        const next = line ? `${line} ${word}` : word;

        if (next.length > maxChars && line) {
            lines.push(line);
            line = word;
        } else {
            line = next;
        }
    }

    if (line) lines.push(line);
    return lines;
}

// Picks the largest font size whose wrapped headline fits in MAX_LINES
function fitHeadline(headline) {
    for (const size of [88, 78, 68, 60, 52, 46]) {
        const maxChars = Math.floor(TEXT_WIDTH / (size * 0.54));
        const lines = wrapText(headline, maxChars);
        if (lines.length <= MAX_LINES) return { size, lines };
    }

    const size = 46;
    const lines = wrapText(headline, Math.floor(TEXT_WIDTH / (size * 0.54))).slice(0, MAX_LINES);
    lines[MAX_LINES - 1] = lines[MAX_LINES - 1].replace(/\s*\S{0,3}$/, "") + "…";
    return { size, lines };
}

function sourceLine(sources) {
    const first = sources?.[0];
    if (!first?.url) return "";

    let host = "";
    try {
        host = new URL(first.url).hostname.replace(/^www\./, "");
    } catch {
        return "";
    }

    let date = "";
    if (first.publishedAt) {
        const parsed = new Date(first.publishedAt);
        if (!Number.isNaN(parsed.getTime())) {
            date = parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
        }
    }

    return date ? `Source: ${host}  ·  ${date}` : `Source: ${host}`;
}


function buildSvg({ headline, topic, sources }) {
    const { size, lines } = fitHeadline(headline);
    const lineHeight = Math.round(size * 1.2);
    const startY = 300;

    const headlineSvg = lines
        .map((line, index) =>
            `<text x="${MARGIN}" y="${startY + index * lineHeight}" font-size="${size}" font-weight="700" fill="#f5f2ef">${escapeXml(line)}</text>`
        )
        .join("\n    ");

    const label = escapeXml(String(topic || "Technology news").toUpperCase().slice(0, 40));
    const source = escapeXml(sourceLine(sources));

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" font-family="${FONT_FAMILY}">
  <defs>
    <radialGradient id="glow" cx="0.85" cy="0.1" r="0.8">
      <stop offset="0" stop-color="#ff893a" stop-opacity="0.32"/>
      <stop offset="1" stop-color="#ff893a" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${SIZE}" height="${SIZE}" fill="#0b0b0d"/>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#glow)"/>
  <rect x="28" y="28" width="${SIZE - 56}" height="${SIZE - 56}" rx="30" fill="none" stroke="#ffffff" stroke-opacity="0.08" stroke-width="2"/>

  <g opacity="0.13">${sunLogo("mark", 380, 300, 760)}</g>
  ${sunLogo("badge", 800, 70, 170)}

  <text x="${MARGIN}" y="150" font-size="26" font-weight="700" letter-spacing="5" fill="#d58b58">${label}</text>
  <rect x="${MARGIN}" y="184" width="76" height="5" rx="2.5" fill="#ff9849"/>

  ${headlineSvg}

  <text x="${MARGIN}" y="${SIZE - 96}" font-size="28" fill="#8d8a91">${source}</text>
</svg>`;
}


function renderHeadlineCard({ headline, topic, sources }) {
    const svg = buildSvg({ headline, topic, sources });

    const png = new Resvg(svg, {
        fitTo: { mode: "width", value: SIZE },
        font: { loadSystemFonts: true, defaultFontFamily: "Segoe UI" }
    })
        .render()
        .asPng();

    return { data: Buffer.from(png), mimeType: "image/png" };
}


module.exports = { renderHeadlineCard };
