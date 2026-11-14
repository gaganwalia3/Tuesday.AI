const express = require("express");
const cors = require("cors");

const {
    runAgent,
    resumeConfirmedAction
} = require("./index");

const {
    deletePendingAction
} = require("./agent/pendingActions");

const {
    createConversation,
    updateConversationTitle,
    saveMessage,
    getMessages,
    getConversations
} = require("./memory/conversation");

const app = express();


// ==========================================
// MIDDLEWARE
// ==========================================

app.use(cors());

app.use(express.json());


// ==========================================
// CREATE NEW CONVERSATION
// ==========================================

app.post("/api/conversations", async (req, res) => {

    try {

        const conversationId =
            await createConversation();

        return res.json({
            conversationId
        });

    } catch (error) {

        console.error(
            "❌ Failed to create conversation:",
            error
        );

        return res.status(500).json({
            error: "Could not create conversation."
        });

    }

});


// ==========================================
// GET ALL CONVERSATIONS
// ==========================================

app.get("/api/conversations", async (req, res) => {

    try {

        const conversations =
            await getConversations();

        return res.json(conversations);

    } catch (error) {

        console.error(
            "❌ Failed to get conversations:",
            error
        );

        return res.status(500).json({
            error: "Could not load conversations."
        });

    }

});


// ==========================================
// GET MESSAGES
// ==========================================

app.get(
    "/api/conversations/:id/messages",
    async (req, res) => {

        try {

            const conversationId =
                req.params.id;

            const messages =
                await getMessages(conversationId);

            return res.json(messages);

        } catch (error) {

            console.error(
                "❌ Failed to get messages:",
                error
            );

            return res.status(500).json({
                error: "Could not load messages."
            });

        }

    }
);


// ==========================================
// CHAT
// ==========================================

app.post("/api/chat", async (req, res) => {

    try {

        const {
            conversationId,
            messages
        } = req.body;


        // ======================================
        // VALIDATE CONVERSATION
        // ======================================

        if (!conversationId) {

            return res.status(400).json({
                error:
                    "conversationId is required."
            });

        }


        // ======================================
        // VALIDATE MESSAGES
        // ======================================

        if (
            !messages ||
            !Array.isArray(messages)
        ) {

            return res.status(400).json({
                error:
                    "Messages are required."
            });

        }


        if (messages.length === 0) {

            return res.status(400).json({
                error:
                    "At least one message is required."
            });

        }


        // ======================================
        // GET LATEST MESSAGE
        // ======================================

        const latestMessage =
            messages[messages.length - 1];


        if (
            !latestMessage ||
            latestMessage.role !== "user"
        ) {

            return res.status(400).json({
                error:
                    "Last message must be from the user."
            });

        }


        if (
            !latestMessage.content ||
            typeof latestMessage.content !== "string" ||
            !latestMessage.content.trim()
        ) {

            return res.status(400).json({
                error:
                    "User message cannot be empty."
            });

        }


        console.log(
            "\n💬 Conversation:",
            conversationId
        );


        // ======================================
        // RUN AGENT
        // ======================================

        const result =
            await runAgent(messages);


        // ======================================
        // CONFIRMATION REQUIRED
        // ======================================

        if (
            result.status ===
            "confirmation_required"
        ) {

            console.log(
                "\n⏸️ Agent is waiting for confirmation."
            );

            console.log(
                "🔧 Tool:",
                result.confirmation.tool
            );

            console.log(
                "🆔 Confirmation ID:",
                result.confirmation.id
            );


            /*
             * Save the user's request.
             *
             * We do NOT save an assistant response because
             * Nexus has not finished answering yet.
             */

            await saveMessage(
                conversationId,
                "user",
                latestMessage.content
            );


            return res.json({

                status:
                    "confirmation_required",

                confirmation:
                    result.confirmation

            });

        }


        // ======================================
        // NORMAL COMPLETED RESPONSE
        // ======================================

        if (
            result.status !== "completed"
        ) {

            return res.status(500).json({

                error:
                    "Agent did not complete the request.",

                type:
                    "AGENT_INCOMPLETE"

            });

        }


        const answer =
            result.text;


        // ======================================
        // SAVE USER MESSAGE
        // ======================================

        await saveMessage(
            conversationId,
            "user",
            latestMessage.content
        );


        // ======================================
        // SAVE ASSISTANT MESSAGE
        // ======================================

        await saveMessage(
            conversationId,
            "assistant",
            answer
        );


        // ======================================
        // AUTOMATIC TITLE
        // ==========================================

        const conversations =
            await getConversations();


        const currentConversation =
            conversations.find(
                conversation =>
                    conversation.id == conversationId
            );


        if (
            currentConversation &&
            currentConversation.title === "New Chat"
        ) {

            let title =
                latestMessage.content.trim();


            title =
                title.replace(/\s+/g, " ");


            if (title.length > 40) {

                title =
                    title.substring(0, 40) + "...";

            }


            await updateConversationTitle(
                conversationId,
                title
            );

        }


        // ======================================
        // SUCCESS
        // ======================================

        return res.json({

            status:
                "completed",

            response:
                answer

        });


    } catch (error) {

        console.error(
            "❌ Agent error:",
            error
        );


        // ======================================
        // GEMINI QUOTA / RATE LIMIT
        // ======================================

        if (
            error.status === 429 ||
            error.code === 429 ||
            error.message?.includes(
                "RESOURCE_EXHAUSTED"
            )
        ) {

            return res.status(429).json({

                error:
                    "Gemini API quota has been exhausted. Please try again later.",

                type:
                    "QUOTA_EXHAUSTED"

            });

        }


        // ======================================
        // GEMINI INVALID REQUEST
        // ======================================

        if (
            error.status === 400 ||
            error.code === 400
        ) {

            return res.status(400).json({

                error:
                    "The AI request was invalid.",

                type:
                    "INVALID_REQUEST"

            });

        }


        // ======================================
        // OTHER SERVER ERROR
        // ======================================

        return res.status(500).json({

            error:
                "The AI encountered an unexpected error.",

            type:
                "AGENT_ERROR"

        });

    }

});


// ==========================================
// CONFIRM / REJECT AGENT ACTION
// ==========================================

app.post(
    "/api/agent/confirm",
    async (req, res) => {

        try {

            const {
                confirmationId,
                approved
            } = req.body;


            // ======================================
            // VALIDATE CONFIRMATION ID
            // ======================================

            if (!confirmationId) {

                return res.status(400).json({

                    error:
                        "confirmationId is required."

                });

            }


            // ======================================
            // REJECT / CANCEL
            // ======================================

            if (approved !== true) {

                deletePendingAction(
                    confirmationId
                );


                console.log(
                    "\n❌ Agent action cancelled."
                );


                return res.json({

                    status:
                        "cancelled",

                    message:
                        "Action cancelled by the user."

                });

            }


            // ======================================
            // APPROVE
            // ======================================

            console.log(
                "\n✅ Agent action approved."
            );


            console.log(
                "🆔 Confirmation ID:",
                confirmationId
            );


            const result =
                await resumeConfirmedAction(
                    confirmationId
                );


            // ======================================
            // COMPLETED
            // ======================================

            if (
                result.status ===
                "completed"
            ) {

                return res.json({

                    status:
                        "completed",

                    response:
                        result.text

                });

            }


            // ======================================
            // ANOTHER CONFIRMATION REQUIRED
            // ======================================

            if (
                result.status ===
                "confirmation_required"
            ) {

                console.log(
                    "\n⏸️ Another confirmation is required."
                );


                return res.json({

                    status:
                        "confirmation_required",

                    confirmation:
                        result.confirmation

                });

            }


            // ======================================
            // UNKNOWN AGENT STATUS
            // ======================================

            return res.status(500).json({

                error:
                    "Agent returned an unexpected status.",

                type:
                    "AGENT_UNKNOWN_STATUS"

            });

        } catch (error) {

            console.error(
                "❌ Confirmation error:",
                error
            );


            // ======================================
            // GEMINI QUOTA / RATE LIMIT
            // ======================================

            if (
                error.status === 429 ||
                error.code === 429 ||
                error.message?.includes(
                    "RESOURCE_EXHAUSTED"
                )
            ) {

                return res.status(429).json({

                    error:
                        "Gemini API quota has been exhausted. Please try again later.",

                    type:
                        "QUOTA_EXHAUSTED"

                });

            }


            // ======================================
            // INVALID REQUEST
            // ======================================

            if (
                error.status === 400 ||
                error.code === 400
            ) {

                return res.status(400).json({

                    error:
                        "The confirmation request was invalid.",

                    type:
                        "INVALID_REQUEST"

                });

            }


            // ======================================
            // OTHER ERROR
            // ======================================

            return res.status(500).json({

                error:
                    "Failed to process the confirmation.",

                type:
                    "CONFIRMATION_ERROR"

            });

        }

    }
);


// ==========================================
// START SERVER
// ==========================================

const PORT = 3000;

app.listen(PORT, () => {

    console.log(
        `🚀 Agent server running on http://localhost:${PORT}`
    );

});