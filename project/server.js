require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { runAgent, resumeConfirmedAction } = require("./index");
const { deletePendingAction } = require("./agent/pendingActions");
const {
    createConversation,
    updateConversationTitle,
    saveMessage,
    getMessages,
    getConversations,
    deleteConversation
} = require("./memory/conversation");

const techPostDrafts = require("./techPost/drafts");
const linkedin = require("./linkedin/client");

const app = express();

const PORT = process.env.PORT || 3000;
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";


// ==========================================
// MIDDLEWARE
// ==========================================

app.use(cors({ origin: frontendUrl }));
app.use(express.json());


// ==========================================
// HELPERS
// ==========================================

const SERVER_BUSY_MESSAGE = "Our servers are a little busy right now. Please try again in a little while.";

// Groq quota / rate-limit errors
function isQuotaError(error) {
    return (
        error.status === 429 ||
        error.code === 429 ||
        error.code === "rate_limit_exceeded" ||
        error.message?.includes("rate_limit_exceeded") ||
        error.message?.includes("Rate limit")
    );
}

// Works out the HTTP response for an agent failure, plus the text the user sees in the chat
function describeAgentError(error, { invalidMessage, fallbackMessage, fallbackType }) {
    if (isQuotaError(error)) {
        return {
            status: 429,
            type: "QUOTA_EXHAUSTED",
            error: "Groq API rate limit reached. Please try again later.",
            chatText: SERVER_BUSY_MESSAGE
        };
    }

    if (
        error.status === 400 ||
        error.code === 400 ||
        error.code === "invalid_request_error"
    ) {
        return {
            status: 400,
            type: "INVALID_REQUEST",
            error: invalidMessage,
            chatText: `${invalidMessage} Please try again.`
        };
    }

    return {
        status: 500,
        type: fallbackType,
        error: fallbackMessage,
        chatText: fallbackMessage
    };
}

// Shared error response for the confirmation route
function sendAgentError(res, error, options) {
    const failure = describeAgentError(error, options);
    return res.status(failure.status).json({ error: failure.error, type: failure.type });
}

// Gives a "New Chat" its title from the first message
async function autoTitleConversation(conversationId, content) {
    const conversations = await getConversations();
    const current = conversations.find((conversation) => conversation.id == conversationId);

    if (current && current.title === "New Chat") {
        let title = content.trim().replace(/\s+/g, " ");
        if (title.length > 40) title = title.substring(0, 40) + "...";

        await updateConversationTitle(conversationId, title);
    }
}

// Stores the error as a notice in the chat (falls back to an assistant message
// if the database only allows user/assistant roles)
async function saveErrorNotice(conversationId, text) {
    try {
        await saveMessage(conversationId, "error", text);
    } catch {
        await saveMessage(conversationId, "assistant", text);
    }
}

// When the agent fails, keep the user's message and the error in the chat
// so the conversation isn't empty when it is opened later
async function recordFailedTurn({ conversationId, latestMessage, userMessageSaved, errorText }) {
    if (
        !conversationId ||
        latestMessage?.role !== "user" ||
        typeof latestMessage.content !== "string" ||
        !latestMessage.content.trim()
    ) {
        return;
    }

    try {
        if (!userMessageSaved) await saveMessage(conversationId, "user", latestMessage.content);
        await saveErrorNotice(conversationId, errorText);
        await autoTitleConversation(conversationId, latestMessage.content);
    } catch (saveError) {
        console.error("Could not record the failed message:", saveError);
    }
}


// ==========================================
// LIVE AGENT ACTIVITY
// What the agent is doing right now, per conversation.
// The frontend polls this to show "Searching the web…" etc.
// ==========================================

const agentActivity = new Map();

function setActivity(conversationId, text) {
    if (conversationId === undefined || conversationId === null) return;

    if (text) agentActivity.set(String(conversationId), text);
    else agentActivity.delete(String(conversationId));
}

app.get("/api/agent/status", (req, res) => {
    res.json({
        activity: agentActivity.get(String(req.query.conversationId)) || null
    });
});


// ==========================================
// MANUAL TECH POST RESEARCH AND REVIEW
// ==========================================

app.get("/api/tech-post/drafts", async (req, res) => {
    try {
        return res.json(await techPostDrafts.listDrafts());
    } catch (error) {
        console.error("Failed to load technology post drafts:", error);
        return res.status(500).json({ error: "Could not load technology post drafts." });
    }
});

app.post("/api/tech-post/drafts", async (req, res) => {
    try {
        const topic = typeof req.body?.topic === "string" ? req.body.topic.trim().slice(0, 180) : "";
        const draft = await techPostDrafts.createDraft(topic);
        return res.status(201).json(draft);
    } catch (error) {
        console.error("Failed to draft a technology post:", error);
        return res.status(502).json({
            error: error.message || "Could not research and draft a technology post."
        });
    }
});

app.get("/api/tech-post/drafts/:id/image", async (req, res) => {
    try {
        const image = await techPostDrafts.getDraftImage(req.params.id);
        if (!image) return res.status(404).json({ error: "Draft image not found." });

        return res
            .type(image.image_mime)
            .set("Cache-Control", "private, no-store")
            .send(image.image_data);
    } catch (error) {
        console.error("Failed to load technology post image:", error);
        return res.status(500).json({ error: "Could not load the draft image." });
    }
});

app.patch("/api/tech-post/drafts/:id", async (req, res) => {
    try {
        const caption = typeof req.body?.caption === "string" ? req.body.caption.trim() : "";
        if (!caption || caption.length > 12000) {
            return res.status(400).json({ error: "Caption must be between 1 and 12,000 characters." });
        }

        const draft = await techPostDrafts.updateCaption(req.params.id, caption);
        if (!draft) return res.status(409).json({ error: "This draft can no longer be edited." });

        return res.json(draft);
    } catch (error) {
        console.error("Failed to edit technology post draft:", error);
        return res.status(500).json({ error: "Could not save the draft edit." });
    }
});

app.post("/api/tech-post/drafts/:id/reject", async (req, res) => {
    try {
        const rejected = await techPostDrafts.rejectDraft(req.params.id);
        if (!rejected) return res.status(409).json({ error: "This draft can no longer be rejected." });

        return res.json({ status: "rejected" });
    } catch (error) {
        console.error("Failed to reject technology post draft:", error);
        return res.status(500).json({ error: "Could not reject the draft." });
    }
});

app.post("/api/tech-post/drafts/:id/publish", async (req, res) => {
    if (req.body?.approved !== true) {
        return res.status(400).json({ error: "Explicit approval is required before publishing." });
    }

    try {
        const status = await linkedin.getStatus();
        if (!status.connected) {
            return res.status(409).json({ error: status.message || "Connect LinkedIn before publishing." });
        }

        const claimed = await techPostDrafts.claimDraft(req.params.id);
        if (!claimed) {
            return res.status(409).json({ error: "This draft is no longer waiting for approval." });
        }

        const result = await linkedin.publishApprovedDraft(req.params.id);
        return res.json({ status: "posted", postUrn: result.postUrn });
    } catch (error) {
        console.error("Failed to publish approved technology post:", error);
        return res
            .status(error.message?.includes("LinkedIn") ? 409 : 502)
            .json({ error: error.message || "LinkedIn could not publish this draft." });
    }
});


// ==========================================
// LINKEDIN MEMBER CONNECTION
// ==========================================

app.get("/api/linkedin/status", async (req, res) => {
    try {
        return res.json(await linkedin.getStatus());
    } catch (error) {
        console.error("Failed to check LinkedIn connection:", error);
        return res.status(500).json({ error: "Could not check the LinkedIn connection." });
    }
});

app.get("/api/linkedin/connect", (req, res) => {
    try {
        return res.redirect(302, linkedin.createAuthorizationUrl());
    } catch (error) {
        return res.status(503).json({ error: error.message || "LinkedIn connection is not configured." });
    }
});

app.get("/api/linkedin/callback", async (req, res) => {
    try {
        if (req.query.error) throw new Error("LinkedIn access was not granted.");

        await linkedin.completeAuthorization(req.query.code, req.query.state);
        return res.redirect(`${frontendUrl}/?linkedin=connected`);
    } catch (error) {
        console.error("LinkedIn authorization failed:", error);
        return res.redirect(`${frontendUrl}/?linkedin=error`);
    }
});

app.delete("/api/linkedin/connection", async (req, res) => {
    try {
        await linkedin.disconnect();
        return res.json({ status: "disconnected" });
    } catch (error) {
        console.error("Failed to disconnect LinkedIn:", error);
        return res.status(500).json({ error: "Could not disconnect LinkedIn." });
    }
});


// ==========================================
// CONVERSATIONS
// ==========================================

app.post("/api/conversations", async (req, res) => {
    try {
        const conversationId = await createConversation();
        return res.json({ conversationId });
    } catch (error) {
        console.error("❌ Failed to create conversation:", error);
        return res.status(500).json({ error: "Could not create conversation." });
    }
});

app.get("/api/conversations", async (req, res) => {
    try {
        return res.json(await getConversations());
    } catch (error) {
        console.error("❌ Failed to get conversations:", error);
        return res.status(500).json({ error: "Could not load conversations." });
    }
});

app.get("/api/conversations/:id/messages", async (req, res) => {
    try {
        return res.json(await getMessages(req.params.id));
    } catch (error) {
        console.error("❌ Failed to get messages:", error);
        return res.status(500).json({ error: "Could not load messages." });
    }
});

app.delete("/api/conversations/:id", async (req, res) => {
    try {
        if (typeof deleteConversation !== "function") {
            console.error("❌ deleteConversation is missing from ./memory/conversation");
            return res.status(501).json({ error: "Deleting chats is not set up on the server yet." });
        }

        await deleteConversation(req.params.id);
        agentActivity.delete(String(req.params.id));
        return res.json({ status: "deleted" });
    } catch (error) {
        console.error("❌ Failed to delete conversation:", error);
        return res.status(500).json({ error: "Could not delete conversation." });
    }
});


// ==========================================
// CHAT
// ==========================================

app.post("/api/chat", async (req, res) => {
    const { conversationId, messages } = req.body || {};
    const latestMessage = Array.isArray(messages) ? messages[messages.length - 1] : null;
    let userMessageSaved = false;

    try {
        // ----- Validate the request -----

        if (!conversationId) {
            return res.status(400).json({ error: "conversationId is required." });
        }

        if (!Array.isArray(messages)) {
            return res.status(400).json({ error: "Messages are required." });
        }

        if (messages.length === 0) {
            return res.status(400).json({ error: "At least one message is required." });
        }

        if (!latestMessage || latestMessage.role !== "user") {
            return res.status(400).json({ error: "Last message must be from the user." });
        }

        if (typeof latestMessage.content !== "string" || !latestMessage.content.trim()) {
            return res.status(400).json({ error: "User message cannot be empty." });
        }

        console.log("\n💬 Conversation:", conversationId);

        // ----- Run the agent -----

        // Only real conversation turns go to the agent; error notices stay in the chat UI
        const agentMessages = messages.filter(
            (message) => message?.role === "user" || message?.role === "assistant"
        );

        setActivity(conversationId, "Thinking");

        const result = await runAgent(agentMessages, {
            // The agent calls this whenever it starts a new step,
            // e.g. onActivity("Searching the web")
            onActivity: (text) => setActivity(conversationId, text)
        });

        // ----- Agent needs the user's approval first -----

        if (result.status === "confirmation_required") {
            console.log("\n⏸️ Agent is waiting for confirmation.");
            console.log("🔧 Tool:", result.confirmation.tool);
            console.log("🆔 Confirmation ID:", result.confirmation.id);

            // Save only the user's request.
            await saveMessage(conversationId, "user", latestMessage.content);
            userMessageSaved = true;

            return res.json({
                status: "confirmation_required",
                confirmation: result.confirmation
            });
        }

        if (result.status !== "completed") {
            return res.status(500).json({
                error: "Agent did not complete the request.",
                type: "AGENT_INCOMPLETE"
            });
        }

        // ----- Save the conversation -----

        const answer = result.text || "";

        await saveMessage(conversationId, "user", latestMessage.content);
        userMessageSaved = true;
        await saveMessage(conversationId, "assistant", answer);

        await autoTitleConversation(conversationId, latestMessage.content);

        return res.json({ status: "completed", response: answer });
    } catch (error) {
        console.error("❌ Agent error:", error);

        const failure = describeAgentError(error, {
            invalidMessage: "The AI request was invalid.",
            fallbackMessage: "The AI encountered an unexpected error.",
            fallbackType: "AGENT_ERROR"
        });

        // Keep the failed turn in the chat so it isn't empty when reopened
        await recordFailedTurn({
            conversationId,
            latestMessage,
            userMessageSaved,
            errorText: failure.chatText
        });

        return res.status(failure.status).json({ error: failure.error, type: failure.type });
    } finally {
        // Done, paused for confirmation, or failed: nothing is "in progress" anymore
        setActivity(conversationId, null);
    }
});


// ==========================================
// CONFIRM / REJECT AGENT ACTION
// ==========================================

app.post("/api/agent/confirm", async (req, res) => {
    try {
        const { confirmationId, approved } = req.body || {};

        if (!confirmationId) {
            return res.status(400).json({ error: "confirmationId is required." });
        }

        // ----- Rejected / cancelled -----

        if (approved !== true) {
            deletePendingAction(confirmationId);
            console.log("\n❌ Agent action cancelled.");

            return res.json({
                status: "cancelled",
                message: "Action cancelled by the user."
            });
        }

        // ----- Approved -----

        console.log("\n✅ Agent action approved.");
        console.log("🆔 Confirmation ID:", confirmationId);

        const result = await resumeConfirmedAction(confirmationId);

        if (result.status === "completed") {
            return res.json({ status: "completed", response: result.text });
        }

        if (result.status === "confirmation_required") {
            console.log("\n⏸️ Another confirmation is required.");

            return res.json({
                status: "confirmation_required",
                confirmation: result.confirmation
            });
        }

        return res.status(500).json({
            error: "Agent returned an unexpected status.",
            type: "AGENT_UNKNOWN_STATUS"
        });
    } catch (error) {
        console.error("❌ Confirmation error:", error);

        return sendAgentError(res, error, {
            invalidMessage: "The confirmation request was invalid.",
            fallbackMessage: "Failed to process the confirmation.",
            fallbackType: "CONFIRMATION_ERROR"
        });
    }
});


// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {
    console.log(`🚀 Nexus AI server running on http://localhost:${PORT}`);
});
