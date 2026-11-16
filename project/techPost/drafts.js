const OpenAI = require("openai");
const { GoogleGenAI } = require("@google/genai");
const db = require("../memory/database");
const searchWeb = require("../tools/searchWeb");

// The caption is written by the same Groq model the chat uses.
// Gemini is only used for the (optional) post image.
const textModel = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
const imageModel = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image";

let tablesReady;

async function ensureTables() {
    if (!tablesReady) {
        tablesReady = db.query(`
            CREATE TABLE IF NOT EXISTS tech_post_drafts (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                topic VARCHAR(255) NOT NULL,
                headline VARCHAR(255) NOT NULL,
                caption TEXT NOT NULL,
                sources JSON NOT NULL,
                image_data LONGBLOB NULL,
                image_mime VARCHAR(64) NOT NULL DEFAULT 'image/png',
                status VARCHAR(32) NOT NULL DEFAULT 'pending_approval',
                post_urn VARCHAR(255) NULL,
                error_message TEXT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_tech_post_drafts_status_created (status, created_at)
            )
        `).then(() => db.query(
            "ALTER TABLE tech_post_drafts MODIFY image_data LONGBLOB NULL"
        )).catch((error) => {
            tablesReady = null;
            throw error;
        });
    }
    await tablesReady;
}

function getTextClient() {
    if (!process.env.GROQ_API_KEY) {
        throw new Error("GROQ_API_KEY is missing from your .env file.");
    }
    return new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: "https://api.groq.com/openai/v1"
    });
}

function getAi() {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is required to create a technology post draft.");
    }
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

function parseJson(text) {
    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    try {
        return JSON.parse(cleaned);
    } catch {
        const start = cleaned.indexOf("{");
        const end = cleaned.lastIndexOf("}");
        if (start !== -1 && end > start) {
            try {
                return JSON.parse(cleaned.slice(start, end + 1));
            } catch {
                // fall through to the friendly error below
            }
        }
        throw new Error("The AI did not return a usable draft. Please try again.");
    }
}

function normalizeDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeSourceUrl(value) {
    try {
        const url = new URL(value);
        if (url.protocol !== "http:" && url.protocol !== "https:") return null;
        url.hash = "";
        for (const key of [...url.searchParams.keys()]) {
            if (/^(utm_|ref$|source$)/i.test(key)) url.searchParams.delete(key);
        }
        return url.toString().replace(/\/$/, "").toLowerCase();
    } catch {
        return value;
    }
}

async function getRecentlyUsedUrls() {
    const [rows] = await db.execute(
        `SELECT sources FROM tech_post_drafts
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
         AND status <> 'rejected'`
    );
    const used = new Set();
    for (const row of rows) {
        for (const source of parseSources(row.sources)) {
            if (source?.url) used.add(normalizeSourceUrl(source.url));
        }
    }
    return used;
}

async function gatherStories(topic) {
    const datePhrase = new Date().toISOString().slice(0, 10);
    const base = topic?.trim()
        ? [`${topic.trim()} latest release announcement news ${datePhrase}`]
        : [
            `new AI model release announcement latest ${datePhrase}`,
            `new AI tool product launch technology latest ${datePhrase}`,
            `important new technology research launch latest ${datePhrase}`
        ];

    const resultSets = await Promise.all(base.map((query) => searchWeb(query)));
    const recentlyUsed = await getRecentlyUsedUrls();
    const freshnessCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const seen = new Set();
    const stories = resultSets.flat().filter((result) => {
        if (!result?.url || !result?.title) return false;
        const publishedAt = normalizeDate(result.published_date || result.publishedDate);
        if (publishedAt && new Date(publishedAt).getTime() < freshnessCutoff) return false;
        const normalizedUrl = normalizeSourceUrl(result.url);
        if (!normalizedUrl) return false;
        if (seen.has(normalizedUrl) || recentlyUsed.has(normalizedUrl)) return false;
        seen.add(normalizedUrl);
        return true;
    }).map((result) => ({
        title: String(result.title).slice(0, 500),
        url: result.url,
        excerpt: String(result.content || "").slice(0, 1800),
        publishedAt: normalizeDate(result.published_date || result.publishedDate),
        score: Number(result.score) || 0
    })).slice(0, 15);

    if (stories.length < 2) {
        throw new Error("Search did not find enough new, distinct sources to prepare a reliable post. Try a narrower topic or try again later.");
    }
    return stories;
}

async function draftCaption(topic, stories) {
    const prompt = `Prepare one concise, useful LinkedIn post about a genuinely recent technology development. Select one story from these search results and use only claims supported by the supplied material. Never invent a release date, feature, metric, quote, or source. If the evidence is weak or dates are unclear, state that plainly in the post rather than calling it brand new. Use a thoughtful professional voice, explain why the development matters, and end with one specific question. Do not add unsupported hashtags. Return only valid JSON with keys headline, topic, caption, and sourceUrls. sourceUrls must contain the exact URLs of the supplied sources that support the post. ${topic ? `The user asked to focus on: ${topic}.` : "The user wants the most newsworthy recent story across new AI models, tools, and technology."}\n\nSearch results:\n${JSON.stringify(stories)}`;

    const completion = await getTextClient().chat.completions.create({
        model: textModel,
        messages: [{ role: "user", content: prompt }]
    });
    const parsed = parseJson(completion.choices?.[0]?.message?.content || "");
    const allowedSources = new Map(stories.map((source) => [source.url, source]));
    const sources = [...new Set(Array.isArray(parsed.sourceUrls) ? parsed.sourceUrls : [])]
        .filter((url) => allowedSources.has(url))
        .map((url) => allowedSources.get(url));

    if (!parsed.headline || !parsed.caption || sources.length === 0) {
        throw new Error("The research draft did not include a verifiable source. Please try again.");
    }
    return {
        headline: String(parsed.headline).slice(0, 255),
        topic: String(parsed.topic || topic || "Technology news").slice(0, 255),
        caption: String(parsed.caption).slice(0, 12000),
        sources
    };
}

async function generateImage(headline, topic, sources) {
    const ai = getAi();
    const response = await ai.models.generateContent({
        model: imageModel,
        contents: [{
            role: "user",
            parts: [{
                text: `Create a polished editorial illustration for a LinkedIn technology news post. Subject: ${headline}. Topic: ${topic}. Visual context: ${sources[0]?.excerpt || ""}. Use a distinctive, sophisticated visual metaphor, clean composition, warm amber highlights on a deep charcoal base, professional publication art direction, square 1:1 image. Do not include any text, letters, logos, interface screenshots, brand marks, or watermarks.`
            }]
        }]
    });
    const parts = response.candidates?.flatMap((candidate) => candidate.content?.parts || []) || [];
    const image = parts.find((part) => part.inlineData?.data);
    if (!image) throw new Error("The image model did not return an image. Please try again.");
    return {
        data: Buffer.from(image.inlineData.data, "base64"),
        mimeType: image.inlineData.mimeType || "image/png"
    };
}

async function createDraft(topic = "") {
    await ensureTables();
    const [pendingDrafts] = await db.execute(
        "SELECT id FROM tech_post_drafts WHERE status = 'pending_approval' ORDER BY created_at DESC LIMIT 1"
    );
    if (pendingDrafts[0]) {
        throw new Error(`Review or reject draft #${pendingDrafts[0].id} before creating another post.`);
    }
    const stories = await gatherStories(topic);
    const draft = await draftCaption(topic, stories);
    // 1) Try an AI-generated image (needs a Gemini plan that includes image generation)
    let image = null;
    if (process.env.GEMINI_API_KEY) {
        try {
            image = await generateImage(draft.headline, draft.topic, draft.sources);
        } catch (error) {
            console.error("⚠️ Gemini image skipped:", String(error.message).slice(0, 200));
        }
    }

    // 2) Otherwise build a branded headline card locally (free, no API needed)
    if (!image) {
        try {
            image = require("./cardImage").renderHeadlineCard(draft);
        } catch (error) {
            console.error("⚠️ Headline card skipped:", error.message);
        }
    }

    // 3) If both fail, the draft is still saved and can be published as text only
    const [result] = await db.execute(
        `INSERT INTO tech_post_drafts (topic, headline, caption, sources, image_data, image_mime)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
            draft.topic,
            draft.headline,
            draft.caption,
            JSON.stringify(draft.sources),
            image ? image.data : null,
            image ? image.mimeType : "image/png"
        ]
    );
    return getDraft(result.insertId);
}

function parseSources(value) {
    if (Array.isArray(value)) return value;
    try { return JSON.parse(value || "[]"); } catch { return []; }
}

function publicDraft(row) {
    if (!row) return null;
    return {
        id: row.id,
        topic: row.topic,
        headline: row.headline,
        caption: row.caption,
        sources: parseSources(row.sources),
        imageMime: row.image_mime,
        imageUrl: row.has_image ? `/api/tech-post/drafts/${row.id}/image` : null,
        status: row.status,
        postUrn: row.post_urn,
        errorMessage: row.error_message,
        createdAt: row.created_at
    };
}

async function getDraft(id) {
    await ensureTables();
    const [rows] = await db.execute(
        `SELECT id, topic, headline, caption, sources, image_mime, (image_data IS NOT NULL) AS has_image, status, post_urn, error_message, created_at
         FROM tech_post_drafts WHERE id = ? LIMIT 1`,
        [id]
    );
    return publicDraft(rows[0]);
}

async function listDrafts() {
    await ensureTables();
    const [rows] = await db.execute(
        `SELECT id, topic, headline, caption, sources, image_mime, (image_data IS NOT NULL) AS has_image, status, post_urn, error_message, created_at
         FROM tech_post_drafts WHERE status IN ('pending_approval', 'needs_review')
         ORDER BY created_at DESC LIMIT 20`
    );
    return rows.map(publicDraft);
}

async function getDraftImage(id) {
    await ensureTables();
    const [rows] = await db.execute(
        "SELECT image_data, image_mime FROM tech_post_drafts WHERE id = ? LIMIT 1",
        [id]
    );
    return rows[0]?.image_data ? rows[0] : null;
}

async function updateCaption(id, caption) {
    await ensureTables();
    const [result] = await db.execute(
        `UPDATE tech_post_drafts SET caption = ?, error_message = NULL
         WHERE id = ? AND status = 'pending_approval'`,
        [caption, id]
    );
    if (!result.affectedRows) return null;
    return getDraft(id);
}

async function rejectDraft(id) {
    await ensureTables();
    const [result] = await db.execute(
        `UPDATE tech_post_drafts SET status = 'rejected', error_message = NULL
         WHERE id = ? AND status = 'pending_approval'`,
        [id]
    );
    return result.affectedRows > 0;
}

async function claimDraft(id) {
    await ensureTables();
    const [result] = await db.execute(
        `UPDATE tech_post_drafts SET status = 'publishing', error_message = NULL
         WHERE id = ? AND status = 'pending_approval'`,
        [id]
    );
    return result.affectedRows > 0;
}

async function finishDraft(id, postUrn) {
    await ensureTables();
    await db.execute(
        `UPDATE tech_post_drafts SET status = 'posted', post_urn = ?, error_message = NULL
         WHERE id = ? AND status = 'publishing'`,
        [postUrn, id]
    );
}

async function failDraft(id, errorMessage, uncertain = false) {
    await ensureTables();
    await db.execute(
        `UPDATE tech_post_drafts SET status = ?, error_message = ?
         WHERE id = ? AND status = 'publishing'`,
        [uncertain ? "needs_review" : "pending_approval", String(errorMessage).slice(0, 1000), id]
    );
}

async function getPublishData(id) {
    await ensureTables();
    const [rows] = await db.execute(
        `SELECT id, headline, caption, image_data, image_mime, status
         FROM tech_post_drafts WHERE id = ? LIMIT 1`,
        [id]
    );
    return rows[0] || null;
}

module.exports = {
    ensureTables,
    createDraft,
    getDraft,
    listDrafts,
    getDraftImage,
    updateCaption,
    rejectDraft,
    claimDraft,
    finishDraft,
    failDraft,
    getPublishData
};
