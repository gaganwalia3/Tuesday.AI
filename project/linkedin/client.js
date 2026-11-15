const crypto = require("node:crypto");
const db = require("../memory/database");
const drafts = require("../techPost/drafts");

const oauthStates = new Map();
const apiVersion = process.env.LINKEDIN_API_VERSION || "202609";

function configuration() {
    return {
        clientId: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        redirectUri: process.env.LINKEDIN_REDIRECT_URI,
        encryptionKey: process.env.LINKEDIN_TOKEN_ENCRYPTION_KEY
    };
}

function keyBytes() {
    const value = configuration().encryptionKey;
    if (!value) return null;
    const key = /^[0-9a-f]{64}$/i.test(value) ? Buffer.from(value, "hex") : Buffer.from(value, "base64");
    return key.length === 32 ? key : null;
}

function isConfigured() {
    const config = configuration();
    return Boolean(config.clientId && config.clientSecret && config.redirectUri && keyBytes());
}

function encrypt(value) {
    const key = keyBytes();
    if (!key) throw new Error("Set LINKEDIN_TOKEN_ENCRYPTION_KEY to a random 32-byte base64 or hex key.");
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
    return [iv.toString("base64"), cipher.getAuthTag().toString("base64"), ciphertext.toString("base64")].join(".");
}

function decrypt(value) {
    const [ivPart, tagPart, ciphertextPart] = String(value || "").split(".");
    const key = keyBytes();
    if (!key || !ivPart || !tagPart || !ciphertextPart) throw new Error("Stored LinkedIn credentials could not be decrypted. Reconnect LinkedIn.");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivPart, "base64"));
    decipher.setAuthTag(Buffer.from(tagPart, "base64"));
    const plaintext = Buffer.concat([
        decipher.update(Buffer.from(ciphertextPart, "base64")),
        decipher.final()
    ]).toString("utf8");
    return JSON.parse(plaintext);
}

async function ensureTable() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS linkedin_connection (
            id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
            member_id VARCHAR(255) NOT NULL,
            member_name VARCHAR(255) NULL,
            token_ciphertext TEXT NOT NULL,
            expires_at DATETIME NOT NULL,
            connected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
}

async function connectionRow() {
    await ensureTable();
    const [rows] = await db.execute("SELECT * FROM linkedin_connection WHERE id = 1 LIMIT 1");
    return rows[0] || null;
}

async function getStatus() {
    const configured = isConfigured();
    if (!configured) {
        return {
            configured: false,
            connected: false,
            message: "LinkedIn app credentials and a token encryption key are required before connecting."
        };
    }
    const row = await connectionRow();
    if (!row) return { configured: true, connected: false, message: "Connect your LinkedIn account to publish approved drafts." };
    if (new Date(row.expires_at).getTime() <= Date.now()) {
        return { configured: true, connected: false, expired: true, message: "Your LinkedIn authorization expired. Reconnect to publish drafts." };
    }
    return { configured: true, connected: true, name: row.member_name || "LinkedIn member" };
}

function createAuthorizationUrl() {
    if (!isConfigured()) throw new Error("LinkedIn OAuth is not configured.");
    const state = crypto.randomBytes(32).toString("base64url");
    oauthStates.set(state, Date.now() + 10 * 60 * 1000);
    const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
    url.search = new URLSearchParams({
        response_type: "code",
        client_id: configuration().clientId,
        redirect_uri: configuration().redirectUri,
        state,
        scope: "openid profile w_member_social"
    }).toString();
    return url.toString();
}

async function exchangeCode(code) {
    const config = configuration();
    const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: config.redirectUri,
            client_id: config.clientId,
            client_secret: config.clientSecret
        })
    });
    const payload = await response.json();
    if (!response.ok || !payload.access_token) throw new Error(payload.error_description || "LinkedIn could not authorize this connection.");
    return payload;
}

async function linkedinJson(url, token, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            "Linkedin-Version": apiVersion,
            "X-Restli-Protocol-Version": "2.0.0",
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...options.headers
        }
    });
    const raw = await response.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }
    if (!response.ok) {
        const error = new Error(data.message || data.error_description || `LinkedIn request failed (${response.status}).`);
        error.status = response.status;
        throw error;
    }
    return { data, headers: response.headers };
}

async function completeAuthorization(code, state) {
    const expiry = oauthStates.get(state);
    oauthStates.delete(state);
    if (!expiry || expiry < Date.now()) throw new Error("LinkedIn authorization state expired. Please connect again.");
    const token = await exchangeCode(code);
    const { data: profile } = await linkedinJson("https://api.linkedin.com/v2/userinfo", token.access_token);
    if (!profile.sub) throw new Error("LinkedIn did not return a member ID.");
    await ensureTable();
    const expiresAt = new Date(Date.now() + Number(token.expires_in || 0) * 1000);
    await db.execute(
        `INSERT INTO linkedin_connection (id, member_id, member_name, token_ciphertext, expires_at)
         VALUES (1, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE member_id = VALUES(member_id), member_name = VALUES(member_name),
         token_ciphertext = VALUES(token_ciphertext), expires_at = VALUES(expires_at), connected_at = CURRENT_TIMESTAMP`,
        [`urn:li:person:${profile.sub}`, profile.name || null, encrypt({
            accessToken: token.access_token,
            refreshToken: token.refresh_token || null,
            expiresAt: expiresAt.toISOString()
        }), expiresAt]
    );
}

async function getAuthorizedConnection() {
    const row = await connectionRow();
    if (!row) throw new Error("Connect LinkedIn before publishing a draft.");
    const credentials = decrypt(row.token_ciphertext);
    if (Date.now() >= new Date(credentials.expiresAt).getTime()) {
        throw new Error("LinkedIn authorization expired. Reconnect your account before publishing.");
    }
    return { row, accessToken: credentials.accessToken };
}

async function disconnect() {
    await ensureTable();
    await db.execute("DELETE FROM linkedin_connection WHERE id = 1");
}

async function publishApprovedDraft(id) {
    const [draftRows] = await db.execute(
        `SELECT id, headline, caption, image_data, image_mime, status
         FROM tech_post_drafts WHERE id = ? LIMIT 1`,
        [id]
    );
    const draft = draftRows[0];
    if (!draft || draft.status !== "publishing") throw new Error("This draft is no longer awaiting approval.");
    let postRequestStarted = false;
    try {
        const { row, accessToken } = await getAuthorizedConnection();
        const { data: upload } = await linkedinJson(
            "https://api.linkedin.com/rest/images?action=initializeUpload",
            accessToken,
            {
                method: "POST",
                body: JSON.stringify({ initializeUploadRequest: { owner: row.member_id } })
            }
        );
        const imageUrn = upload.value?.image;
        const uploadUrl = upload.value?.uploadUrl;
        if (!imageUrn || !uploadUrl) throw new Error("LinkedIn did not provide an image upload URL.");

        const uploadResponse = await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": draft.image_mime },
            body: new Uint8Array(draft.image_data)
        });
        if (!uploadResponse.ok) throw new Error(`LinkedIn image upload failed (${uploadResponse.status}).`);

        postRequestStarted = true;
        const { headers } = await linkedinJson("https://api.linkedin.com/rest/posts", accessToken, {
            method: "POST",
            body: JSON.stringify({
                author: row.member_id,
                commentary: draft.caption,
                visibility: "PUBLIC",
                distribution: {
                    feedDistribution: "MAIN_FEED",
                    targetEntities: [],
                    thirdPartyDistributionChannels: []
                },
                content: {
                    media: {
                        title: draft.headline,
                        id: imageUrn,
                        altText: draft.headline
                    }
                },
                lifecycleState: "PUBLISHED",
                isReshareDisabledByAuthor: false
            })
        });
        const postUrn = headers.get("x-restli-id");
        if (!postUrn) throw new Error("LinkedIn accepted the post but did not return its post ID.");
        await drafts.finishDraft(id, postUrn);
        return { postUrn };
    } catch (error) {
        await drafts.failDraft(id, error.message, postRequestStarted && (!error.status || error.status >= 500));
        throw error;
    }
}

module.exports = {
    isConfigured,
    getStatus,
    createAuthorizationUrl,
    completeAuthorization,
    disconnect,
    publishApprovedDraft
};
