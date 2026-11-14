import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./index.css";

const API_URL = "http://localhost:3000";


function App() {

    const [conversationId, setConversationId] = useState(null);

    const [conversations, setConversations] = useState([]);

    const [messages, setMessages] = useState([]);

    const [message, setMessage] = useState("");

    const [loading, setLoading] = useState(false);

    // ==========================================
    // CONFIRMATION STATE
    // ==========================================

    const [confirmation, setConfirmation] = useState(null);

    const [confirming, setConfirming] = useState(false);


    const messagesEndRef = useRef(null);


    // ==========================================
    // AUTO SCROLL
    // ==========================================

    useEffect(() => {

        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth"
        });

    }, [messages, loading, confirmation]);


    // ==========================================
    // LOAD CONVERSATIONS
    // ==========================================

    useEffect(() => {

        loadConversations();

    }, []);


    // ==========================================
    // LOAD ALL CONVERSATIONS
    // ==========================================

    const loadConversations = async () => {

        try {

            const response = await fetch(
                `${API_URL}/api/conversations`
            );

            const data =
                await response.json();

            setConversations(data);


            if (
                data.length > 0 &&
                conversationId === null
            ) {

                loadConversation(
                    data[0].id
                );

            }

        } catch (error) {

            console.error(
                "Failed to load conversations:",
                error
            );

        }

    };


    // ==========================================
    // NEW CHAT
    // ==========================================

    const newChat = () => {

        setConversationId(null);

        setMessages([]);

        setMessage("");

        setConfirmation(null);

        setConfirming(false);

    };


    // ==========================================
    // LOAD CONVERSATION
    // ==========================================

    const loadConversation = async (id) => {

        try {

            setLoading(true);

            setConfirmation(null);

            setConfirming(false);

            setConversationId(id);


            const response = await fetch(
                `${API_URL}/api/conversations/${id}/messages`
            );

            const data =
                await response.json();

            setMessages(data);

        } catch (error) {

            console.error(
                "Failed to load conversation:",
                error
            );

        } finally {

            setLoading(false);

        }

    };


    // ==========================================
    // CREATE DATABASE CONVERSATION
    // ==========================================

    const createDatabaseConversation =
        async () => {

            const response = await fetch(
                `${API_URL}/api/conversations`,
                {
                    method: "POST"
                }
            );


            if (!response.ok) {

                throw new Error(
                    "Failed to create conversation."
                );

            }


            const data =
                await response.json();

            return data.conversationId;

        };


    // ==========================================
    // SEND MESSAGE
    // ==========================================

    const sendMessage = async () => {

        if (
            !message.trim() ||
            loading ||
            confirming
        ) {

            return;

        }


        const userMessage = {

            role: "user",

            content:
                message.trim()

        };


        let currentConversationId =
            conversationId;


        try {

            setLoading(true);

            setConfirmation(null);


            // ==================================
            // CREATE CHAT ON FIRST MESSAGE
            // ==================================

            if (!currentConversationId) {

                currentConversationId =
                    await createDatabaseConversation();

                setConversationId(
                    currentConversationId
                );

            }


            // ==================================
            // SHOW USER MESSAGE
            // ==================================

            const updatedMessages = [

                ...messages,

                userMessage

            ];


            setMessages(
                updatedMessages
            );

            setMessage("");


            // ==================================
            // SEND TO BACKEND
            // ==================================

            const response =
                await fetch(
                    `${API_URL}/api/chat`,
                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body: JSON.stringify({

                            conversationId:
                                currentConversationId,

                            messages:
                                updatedMessages

                        })

                    }
                );


            const data =
                await response.json();


            // ==================================
            // HANDLE ERROR
            // ==================================

            if (!response.ok) {

                const error =
                    new Error(
                        data.error ||
                        "Request failed."
                    );


                error.status =
                    response.status;


                error.type =
                    data.type;


                throw error;

            }


            // ==================================
            // CONFIRMATION REQUIRED
            // ==================================

            if (
                data.status ===
                "confirmation_required"
            ) {

                console.log(
                    "🔐 Confirmation required:",
                    data.confirmation
                );


                setConfirmation(
                    data.confirmation
                );


                return;

            }


            // ==================================
            // NORMAL AI RESPONSE
            // ==================================

            if (
                data.status ===
                "completed"
            ) {

                setMessages(prev => [

                    ...prev,

                    {

                        role: "assistant",

                        content:
                            data.response

                    }

                ]);

            }


            // ==================================
            // REFRESH SIDEBAR
            // ==================================

            await loadConversations();

            setConversationId(
                currentConversationId
            );


        } catch (error) {

            console.error(
                "Chat error:",
                error
            );


            let errorMessage =
                "Something went wrong. Please try again.";


            if (
                error.status === 429 ||
                error.type ===
                    "QUOTA_EXHAUSTED"
            ) {

                errorMessage =
                    "Gemini API quota is currently exhausted. Your message was not saved. Please try again when the quota resets.";

            }

            else if (
                error.status === 400 ||
                error.type ===
                    "INVALID_REQUEST"
            ) {

                errorMessage =
                    "The AI request was invalid. Please try again.";

            }


            setMessages(prev => [

                ...prev,

                {

                    role: "error",

                    content:
                        errorMessage

                }

            ]);

        } finally {

            setLoading(false);

        }

    };


    // ==========================================
    // CONFIRM ACTION
    // ==========================================

    const handleConfirmation =
        async (approved) => {

            if (
                !confirmation ||
                confirming
            ) {

                return;

            }


            try {

                setConfirming(true);

                setLoading(true);


                console.log(
                    approved
                        ? "✅ Approving action..."
                        : "❌ Cancelling action..."
                );


                const response =
                    await fetch(
                        `${API_URL}/api/agent/confirm`,
                        {

                            method: "POST",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body: JSON.stringify({

                                confirmationId:
                                    confirmation.id,

                                approved

                            })

                        }
                    );


                const data =
                    await response.json();


                // ==================================
                // HANDLE ERROR
                // ==================================

                if (!response.ok) {

                    const error =
                        new Error(
                            data.error ||
                            "Confirmation request failed."
                        );


                    error.status =
                        response.status;


                    error.type =
                        data.type;


                    throw error;

                }


                // ==================================
                // CANCELLED
                // ==================================

                if (
                    data.status ===
                    "cancelled"
                ) {

                    setConfirmation(null);


                    setMessages(prev => [

                        ...prev,

                        {

                            role: "assistant",

                            content:
                                "The action was cancelled."

                        }

                    ]);


                    return;

                }


                // ==================================
                // ANOTHER CONFIRMATION
                // ==================================

                if (
                    data.status ===
                    "confirmation_required"
                ) {

                    setConfirmation(
                        data.confirmation
                    );


                    return;

                }


                // ==================================
                // COMPLETED
                // ==================================

                if (
                    data.status ===
                    "completed"
                ) {

                    setConfirmation(null);


                    setMessages(prev => [

                        ...prev,

                        {

                            role: "assistant",

                            content:
                                data.response

                        }

                    ]);


                    await loadConversations();

                }


            } catch (error) {

                console.error(
                    "Confirmation error:",
                    error
                );


                let errorMessage =
                    "Failed to process the action.";


                if (
                    error.status === 429 ||
                    error.type ===
                        "QUOTA_EXHAUSTED"
                ) {

                    errorMessage =
                        "Gemini API quota is currently exhausted.";

                }


                setMessages(prev => [

                    ...prev,

                    {

                        role: "error",

                        content:
                            errorMessage

                    }

                ]);

            } finally {

                setConfirming(false);

                setLoading(false);

            }

        };


    // ==========================================
    // ENTER KEY
    // ==========================================

    const handleKeyDown = (event) => {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            sendMessage();

        }

    };


    // ==========================================
    // COPY MESSAGE
    // ==========================================

    const copyMessage =
        async (content) => {

            try {

                await navigator.clipboard.writeText(
                    content
                );

            } catch (error) {

                console.error(
                    "Copy failed:",
                    error
                );

            }

        };


    // ==========================================
    // FORMAT TOOL NAME
    // ==========================================

    const formatToolName =
        (tool) => {

            if (!tool) {
                return "this action";
            }

            return tool
                .replace(/([A-Z])/g, " $1")
                .replace(/^./, char =>
                    char.toUpperCase()
                );

        };


    // ==========================================
    // FORMAT CONFIRMATION DETAILS
    // ==========================================

    const formatConfirmationDetails =
        () => {

            if (!confirmation) {
                return "";
            }


            const args =
                confirmation.arguments;


            if (!args) {
                return "";
            }


            return Object.entries(args)

                .map(
                    ([key, value]) =>
                        `${key}: ${
                            typeof value === "object"
                                ? JSON.stringify(value)
                                : value
                        }`
                )

                .join("\n");

        };


    // ==========================================
    // UI
    // ==========================================

    return (

        <div className="app">


            {/* ==================================
                SIDEBAR
                ================================== */}

            <aside className="sidebar">

                <div className="sidebar-header">

                    <div className="brand">

                        <div className="brand-icon">
                            ✦
                        </div>

                        <h2>
                            Nexus AI
                        </h2>

                    </div>


                    <button
                        className="new-chat"
                        onClick={newChat}
                    >

                        <span>
                            ＋
                        </span>

                        New Chat

                    </button>

                </div>


                <div className="sidebar-label">
                    RECENT CHATS
                </div>


                <div className="conversation-list">

                    {conversations.length === 0 && (

                        <div className="empty-sidebar">
                            No conversations yet.
                        </div>

                    )}


                    {conversations.map(
                        (conversation) => (

                            <button

                                key={
                                    conversation.id
                                }

                                className={
                                    `conversation-item ${
                                        conversation.id ===
                                        conversationId
                                            ? "active"
                                            : ""
                                    }`
                                }

                                onClick={() =>
                                    loadConversation(
                                        conversation.id
                                    )
                                }

                            >

                                <span className="conversation-icon">
                                    ◇
                                </span>

                                <span className="conversation-title">

                                    {conversation.title}

                                </span>

                            </button>

                        )
                    )}

                </div>

            </aside>


            {/* ==================================
                MAIN
                ================================== */}

            <div className="main">


                {/* HEADER */}

                <header className="header">

                    <div className="header-title">
                        Personal AI
                    </div>


                    <div className="status">

                        <div className="status-dot"></div>

                        {loading
                            ? "Thinking..."
                            : "Online"}

                    </div>

                </header>


                {/* ==================================
                    CHAT
                    ================================== */}

                <main className="chat">


                    {messages.length === 0 && (

                        <div className="welcome">

                            <div className="welcome-icon">
                                ✦
                            </div>


                            <h1>
                                What can I help you with?
                            </h1>


                            <p>
                                Research the web, explore
                                ideas, remember important
                                things, or just ask me anything.
                            </p>


                            <div className="suggestions">

                                <button
                                    onClick={() =>
                                        setMessage(
                                            "What is happening in AI today?"
                                        )
                                    }
                                >
                                    🌐 Research AI news
                                </button>


                                <button
                                    onClick={() =>
                                        setMessage(
                                            "What do you remember about my project?"
                                        )
                                    }
                                >
                                    🧠 Search my memory
                                </button>


                                <button
                                    onClick={() =>
                                        setMessage(
                                            "What time is it?"
                                        )
                                    }
                                >
                                    ⏰ Get current time
                                </button>

                            </div>

                        </div>

                    )}


                    {messages.map(
                        (msg, index) => (

                            <div
                                key={index}
                                className={
                                    `message ${msg.role}`
                                }
                            >


                                {/* AVATAR */}

                                <div className="avatar">

                                    {msg.role === "user"
                                        ? "G"
                                        : msg.role === "assistant"
                                            ? "✦"
                                            : "!"}

                                </div>


                                {/* MESSAGE */}

                                <div className="message-content">

                                    <div className="message-role">

                                        {msg.role === "user"
                                            ? "You"
                                            : msg.role === "assistant"
                                                ? "Nexus AI"
                                                : "System"}

                                    </div>


                                    <div className="bubble">

                                        {msg.role === "error" ? (

                                            <div className="error-message">

                                                ⚠️ {msg.content}

                                            </div>

                                        ) : (

                                            <ReactMarkdown
                                                remarkPlugins={[
                                                    remarkGfm
                                                ]}
                                                components={{
                                                    code({
                                                        inline,
                                                        className,
                                                        children,
                                                        ...props
                                                    }) {

                                                        return inline ? (

                                                            <code
                                                                className="inline-code"
                                                                {...props}
                                                            >
                                                                {children}
                                                            </code>

                                                        ) : (

                                                            <div className="code-block">

                                                                <button
                                                                    className="copy-code"
                                                                    onClick={() =>
                                                                        copyMessage(
                                                                            String(children)
                                                                        )
                                                                    }
                                                                >
                                                                    Copy
                                                                </button>

                                                                <pre>

                                                                    <code
                                                                        className={
                                                                            className
                                                                        }
                                                                        {...props}
                                                                    >
                                                                        {children}
                                                                    </code>

                                                                </pre>

                                                            </div>

                                                        );

                                                    }
                                                }}
                                            >

                                                {msg.content}

                                            </ReactMarkdown>

                                        )}

                                    </div>


                                    {/* COPY BUTTON */}

                                    {msg.role === "assistant" && (

                                        <button
                                            className="copy-message"
                                            onClick={() =>
                                                copyMessage(
                                                    msg.content
                                                )
                                            }
                                        >
                                            📋 Copy
                                        </button>

                                    )}

                                </div>

                            </div>

                        )
                    )}


                    {/* ==================================
                        CONFIRMATION CARD
                        ================================== */}

                    {confirmation && (

                        <div className="confirmation-card">

                            <div className="confirmation-icon">
                                🔐
                            </div>


                            <div className="confirmation-content">

                                <div className="confirmation-title">

                                    Nexus needs your approval

                                </div>


                                <div className="confirmation-description">

                                    Nexus wants to perform:

                                </div>


                                <div className="confirmation-action">

                                    {formatToolName(
                                        confirmation.tool
                                    )}

                                </div>


                                {formatConfirmationDetails() && (

                                    <pre className="confirmation-details">

                                        {
                                            formatConfirmationDetails()
                                        }

                                    </pre>

                                )}


                                <div className="confirmation-warning">

                                    This action requires your explicit
                                    permission before it can be executed.

                                </div>


                                <div className="confirmation-buttons">

                                    <button

                                        className="confirmation-cancel"

                                        onClick={() =>
                                            handleConfirmation(
                                                false
                                            )
                                        }

                                        disabled={
                                            confirming
                                        }

                                    >

                                        Cancel

                                    </button>


                                    <button

                                        className="confirmation-approve"

                                        onClick={() =>
                                            handleConfirmation(
                                                true
                                            )
                                        }

                                        disabled={
                                            confirming
                                        }

                                    >

                                        {confirming
                                            ? "Processing..."
                                            : "Approve"}

                                    </button>

                                </div>

                            </div>

                        </div>

                    )}


                    {/* ==================================
                        THINKING
                        ================================== */}

                    {loading && !confirmation && (

                        <div className="message assistant">

                            <div className="avatar">
                                ✦
                            </div>


                            <div className="message-content">

                                <div className="message-role">
                                    Nexus AI
                                </div>


                                <div className="thinking">

                                    <span></span>
                                    <span></span>
                                    <span></span>

                                </div>

                            </div>

                        </div>

                    )}


                    <div
                        ref={messagesEndRef}
                    />

                </main>


                {/* ==================================
                    INPUT
                    ================================== */}

                <div className="input-area">

                    <div className="input-wrapper">

                        <input

                            type="text"

                            placeholder="Message Nexus AI..."

                            value={message}

                            onChange={(e) =>
                                setMessage(
                                    e.target.value
                                )
                            }

                            onKeyDown={
                                handleKeyDown
                            }

                            disabled={
                                loading ||
                                confirming
                            }

                        />


                        <button

                            onClick={sendMessage}

                            disabled={
                                loading ||
                                confirming ||
                                !message.trim()
                            }

                        >

                            ↑

                        </button>

                    </div>


                    <div className="input-hint">

                        {confirmation
                            ? "Approve or cancel the pending action"
                            : "Enter to send · Shift + Enter for a new line"}

                    </div>

                </div>

            </div>

        </div>

    );

}


export default App;