import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import sunRays from "./assets/sun-rays.svg";
import sunCore from "./assets/sun-core.svg";
import "./index.css";

const API_URL = "http://localhost:3000";
const SERVER_BUSY_MESSAGE = "Our servers are a little busy right now. Please try again in a little while.";

/* -------------------------------------------------------------------------
   Static data
   ------------------------------------------------------------------------- */

// Shown in the right-rail "Agent toolkit" panel. Clicking one fills the composer.
const promptCards = [
    {
        icon: "⌕",
        title: "Research a topic",
        description: "Search the web and pull together the useful details.",
        prompt: "Research the latest developments in AI and summarize the key points."
    },
    {
        icon: "◈",
        title: "Find a memory",
        description: "Bring back something you asked Tuesday to remember.",
        prompt: "Search my saved memories for anything relevant to my current projects."
    },
    {
        icon: "▤",
        title: "Organize my tasks",
        description: "Review what is pending or add a new task by describing it.",
        prompt: "List my pending tasks."
    },
    {
        icon: "⌁",
        title: "Plan my day",
        description: "Turn priorities into a clear, realistic plan.",
        prompt: "Help me plan my day. First ask what I need to get done if you need more context."
    },
    {
        icon: "↗",
        title: "Draft a tech post",
        description: "Find a fresh technology story and prepare a sourced LinkedIn draft with an image.",
        prompt: "/techpost"
    }
];

/* -------------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------------- */

function greetingForTime() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
}

async function readTechPostResponse(response) {
    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
        if (contentType.includes("text/html") || response.status === 404) {
            throw new Error(
                "The running backend does not have the tech-post API yet. Copy the updated project/server.js and project/techPost folder, then restart the API server."
            );
        }
        throw new Error(
            "The API server returned an unexpected response. Restart the updated Tuesday AI API server and try again."
        );
    }

    return response.json();
}

function statusLabel(status) {
    if (status === "posted") return "Published";
    if (status === "needs_review") return "Needs review";
    return "Awaiting your review";
}

function formatToolName(tool) {
    if (!tool) return "this action";
    return tool.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}

/* -------------------------------------------------------------------------
   To-Do card (right rail)
   ------------------------------------------------------------------------- */

const TODO_STORAGE_KEY = "tuesday-ai-todos";

function loadTodos() {
    try {
        const saved = JSON.parse(window.localStorage.getItem(TODO_STORAGE_KEY));
        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
}

// Formats a Date for <input type="datetime-local"> in local time
function toLocalInputValue(date) {
    const pad = (value) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatRemaining(ms) {
    const overdue = ms < 0;
    const total = Math.floor(Math.abs(ms) / 1000);
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = String(total % 60).padStart(2, "0");

    let text;
    if (days > 0) text = `${days}d ${hours}h ${minutes}m`;
    else if (hours > 0) text = `${hours}h ${String(minutes).padStart(2, "0")}m ${seconds}s`;
    else text = `${minutes}m ${seconds}s`;

    return { overdue, text: overdue ? `−${text}` : text };
}

function TodoCard() {
    const [todos, setTodos] = useState(loadTodos);
    const [adding, setAdding] = useState(false);
    const [title, setTitle] = useState("");
    const [due, setDue] = useState("");
    const [now, setNow] = useState(() => Date.now());

    // Save to the browser whenever the list changes
    useEffect(() => {
        try {
            window.localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(todos));
        } catch (error) {
            console.error("Could not save to-dos:", error);
        }
    }, [todos]);

    // Tick every second, but only while something is still pending
    const hasPending = todos.some((todo) => !todo.done);
    useEffect(() => {
        if (!hasPending) return undefined;
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, [hasPending]);

    const openForm = () => {
        setTitle("");
        setDue(toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000)));
        setAdding(true);
    };

    const addTodo = (event) => {
        event.preventDefault();
        const dueTime = new Date(due).getTime();
        if (!title.trim() || Number.isNaN(dueTime)) return;

        setTodos((previous) => [
            ...previous,
            { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, title: title.trim(), due: dueTime, done: false }
        ]);
        setNow(Date.now());
        setAdding(false);
    };

    const toggleTodo = (id) => {
        setTodos((previous) => previous.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)));
    };

    const removeTodo = (id) => {
        setTodos((previous) => previous.filter((todo) => todo.id !== id));
    };

    // Pending first (soonest deadline on top), finished ones at the bottom
    const sortedTodos = [...todos].sort((a, b) => Number(a.done) - Number(b.done) || a.due - b.due);
    const remaining = todos.filter((todo) => !todo.done).length;

    return (
        <section className="rail-card todo-card">
            <div className="rail-card-heading">
                <div className="heading-with-icon">
                    <span className="rail-heading-icon">☑</span>
                    <h2>To-Do</h2>
                </div>
                {todos.length > 0 && <span className="tool-count">{remaining} left</span>}
            </div>

            {sortedTodos.length > 0 && (
                <ul className="todo-list">
                    {sortedTodos.map((todo) => {
                        const { overdue, text } = formatRemaining(todo.due - now);
                        return (
                            <li
                                key={todo.id}
                                className={`todo-row ${todo.done ? "done" : ""} ${!todo.done && overdue ? "overdue" : ""}`}
                            >
                                <button
                                    className="todo-check"
                                    role="checkbox"
                                    aria-checked={todo.done}
                                    aria-label={`Mark "${todo.title}" as ${todo.done ? "not done" : "done"}`}
                                    onClick={() => toggleTodo(todo.id)}
                                >
                                    {todo.done ? "✓" : ""}
                                </button>
                                <span className="todo-title" title={todo.title}>{todo.title}</span>
                                <span
                                    className="todo-time"
                                    title={`Due ${new Date(todo.due).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`}
                                >
                                    {todo.done ? "Done" : text}
                                </span>
                                <button className="todo-remove" aria-label={`Delete "${todo.title}"`} onClick={() => removeTodo(todo.id)}>
                                    ✕
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}

            {adding ? (
                <form className="todo-form" onSubmit={addTodo}>
                    <label>
                        Task
                        <input
                            type="text"
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            placeholder="What needs to get done?"
                            maxLength={120}
                            autoFocus
                        />
                    </label>
                    <label>
                        Complete by
                        <input type="datetime-local" value={due} onChange={(event) => setDue(event.target.value)} />
                    </label>
                    <div className="todo-form-actions">
                        <button type="button" className="todo-cancel" onClick={() => setAdding(false)}>Cancel</button>
                        <button type="submit" className="todo-submit" disabled={!title.trim() || !due}>Add</button>
                    </div>
                </form>
            ) : (
                <button className="todo-add" onClick={openForm}>
                    <span aria-hidden="true">＋</span> Add To-Do
                </button>
            )}
        </section>
    );
}

/* -------------------------------------------------------------------------
   Working indicator (spinning sun + live timer + current activity)
   ------------------------------------------------------------------------- */

function formatElapsed(totalSeconds) {
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const minutes = Math.floor(totalSeconds / 60);
    return `${minutes}m ${String(totalSeconds % 60).padStart(2, "0")}s`;
}

function WorkingIndicator({ conversationId }) {
    const [startedAt] = useState(() => Date.now());
    const [elapsed, setElapsed] = useState(0);
    const [activity, setActivity] = useState("");

    // Timer
    useEffect(() => {
        const timer = window.setInterval(() => {
            setElapsed(Math.floor((Date.now() - startedAt) / 1000));
        }, 1000);
        return () => window.clearInterval(timer);
    }, [startedAt]);

    // What the agent is doing right now (asks the backend once a second)
    useEffect(() => {
        if (!conversationId) return undefined;
        let cancelled = false;

        const poll = async () => {
            try {
                const response = await fetch(`${API_URL}/api/agent/status?conversationId=${conversationId}`);
                if (!response.ok) return;
                const data = await response.json();
                if (!cancelled) setActivity(data.activity || "");
            } catch {
                // Status is optional; keep showing the last known activity
            }
        };

        const timer = window.setInterval(poll, 1000);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [conversationId]);

    return (
        <div className="thinking-row">
            <span className="thinking-sun" aria-hidden="true">
                <img className="sun-rays" src={sunRays} alt="" draggable="false" />
                <img className="sun-core" src={sunCore} alt="" draggable="false" />
            </span>
            <div className="working-copy">
                <span className="thinking-label">
                    Working for <b>{formatElapsed(elapsed)}</b>
                </span>
                <span className="working-activity">{activity || "Thinking"}…</span>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------
   App
   ------------------------------------------------------------------------- */

function App() {
    /* ----- State ----- */
    const [conversationId, setConversationId] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [confirmation, setConfirmation] = useState(null);
    const [confirming, setConfirming] = useState(false);
    const [notice, setNotice] = useState("");
    const [techDraft, setTechDraft] = useState(null);
    const [draftCaption, setDraftCaption] = useState("");
    const [linkedInStatus, setLinkedInStatus] = useState({ configured: false, connected: false });
    const [revealedChats, setRevealedChats] = useState(() => new Set());
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const messagesEndRef = useRef(null);
    const messageInputRef = useRef(null);

    /* ----- Data loading ----- */

    const loadConversation = useCallback(async (id) => {
        try {
            setLoading(true);
            setNotice("");
            setConfirmation(null);
            setConfirming(false);
            setConversationId(id);

            const response = await fetch(`${API_URL}/api/conversations/${id}/messages`);
            if (!response.ok) throw new Error("Could not load this conversation.");
            setMessages(await response.json());
        } catch (error) {
            console.error("Failed to load conversation:", error);
            setNotice("This conversation could not be loaded. Please try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    const loadConversations = useCallback(
        async (openLatest = false) => {
            try {
                const response = await fetch(`${API_URL}/api/conversations`);
                if (!response.ok) throw new Error("Could not load conversations.");

                const data = await response.json();
                setConversations(data);
                if (openLatest && data.length > 0) loadConversation(data[0].id);
            } catch (error) {
                console.error("Failed to load conversations:", error);
                setNotice("Could not connect to the chat server. Check that Tuesday AI is running, then try again.");
            }
        },
        [loadConversation]
    );

    const loadTechDraft = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/api/tech-post/drafts`);
            if (!response.ok) throw new Error("Could not load saved drafts.");

            const drafts = await response.json();
            const current = drafts[0] || null;
            setTechDraft(current);
            setDraftCaption(current?.caption || "");
        } catch (error) {
            console.error("Failed to load post draft:", error);
        }
    }, []);

    const loadLinkedInStatus = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/api/linkedin/status`);
            if (!response.ok) throw new Error("Could not check LinkedIn status.");
            setLinkedInStatus(await response.json());
        } catch (error) {
            console.error("Failed to check LinkedIn status:", error);
            setLinkedInStatus({
                configured: false,
                connected: false,
                message: "LinkedIn connection status is unavailable."
            });
        }
    }, []);

    const newChat = useCallback(() => {
        setConversationId(null);
        setMessages([]);
        setMessage("");
        setConfirmation(null);
        setConfirming(false);
        setNotice("");
        messageInputRef.current?.focus();
    }, []);

    /* ----- Effects ----- */

    // Keep the latest message in view
    useEffect(() => {
        if (messages.length > 0 || confirmation) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, loading, confirmation]);

    // Initial conversation list
    useEffect(() => {
        const timer = window.setTimeout(() => loadConversations(), 0);
        return () => window.clearTimeout(timer);
    }, [loadConversations]);

    // Initial tech draft + LinkedIn status (and OAuth redirect result)
    useEffect(() => {
        const timer = window.setTimeout(() => {
            loadTechDraft();
            loadLinkedInStatus();

            const result = new URLSearchParams(window.location.search).get("linkedin");
            if (result === "connected") {
                setNotice("LinkedIn connected. Review a draft before choosing Approve & publish.");
            }
            if (result === "error") {
                setNotice("LinkedIn connection did not complete. Check the app setup and try again.");
            }
            if (result) window.history.replaceState({}, "", window.location.pathname);
        }, 0);

        return () => window.clearTimeout(timer);
    }, [loadTechDraft, loadLinkedInStatus]);

    // Ctrl/Cmd + K starts a new chat
    useEffect(() => {
        const handleNewChatShortcut = (event) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
                event.preventDefault();
                newChat();
            }
        };

        window.addEventListener("keydown", handleNewChatShortcut);
        return () => window.removeEventListener("keydown", handleNewChatShortcut);
    }, [newChat]);

    /* ----- Chat actions ----- */

    const createDatabaseConversation = async () => {
        const response = await fetch(`${API_URL}/api/conversations`, { method: "POST" });
        if (!response.ok) throw new Error("Failed to create conversation.");

        const data = await response.json();
        return data.conversationId;
    };

    const sendMessage = async () => {
        if (!message.trim() || loading || confirming) return;

        // "/techpost [topic]" runs the tech-post flow instead of normal chat
        const techPostCommand = message.trim().match(/^\/techpost(?:\s+([\s\S]+))?$/i);
        if (techPostCommand) {
            const topic = techPostCommand[1]?.trim() || "";
            setMessage("");
            await runTechPost(topic);
            return;
        }

        const userMessage = { role: "user", content: message.trim() };
        let currentConversationId = conversationId;

        try {
            setLoading(true);
            setNotice("");
            setConfirmation(null);

            if (!currentConversationId) {
                currentConversationId = await createDatabaseConversation();
                setConversationId(currentConversationId);
            }

            const updatedMessages = [...messages, userMessage];
            setMessages(updatedMessages);
            setMessage("");

            const response = await fetch(`${API_URL}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    conversationId: currentConversationId,
                    messages: updatedMessages
                })
            });

            const data = await response.json();
            if (!response.ok) {
                const error = new Error(data.error || "Request failed.");
                error.status = response.status;
                error.type = data.type;
                throw error;
            }

            if (data.status === "confirmation_required") {
                setConfirmation(data.confirmation);
                await loadConversations();
                return;
            }

            if (data.status === "completed") {
                setMessages((previous) => [...previous, { role: "assistant", content: data.response }]);
            }

            await loadConversations();
            setConversationId(currentConversationId);
        } catch (error) {
            console.error("Chat error:", error);

            let errorMessage = "Something went wrong. Please try again.";
            if (error.status === 429 || error.type === "QUOTA_EXHAUSTED") {
                errorMessage = SERVER_BUSY_MESSAGE;
            } else if (error.status === 400 || error.type === "INVALID_REQUEST") {
                errorMessage = "The AI request was invalid. Please try again.";
            } else if (error.message.includes("Failed to fetch")) {
                errorMessage = "Tuesday AI could not reach its server. Check that the backend is running, then try again.";
            } else if (error.message) {
                errorMessage = error.message;
            }

            setMessages((previous) => [...previous, { role: "error", content: errorMessage }]);
            await loadConversations();
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmation = async (approved) => {
        if (!confirmation || confirming) return;

        try {
            setConfirming(true);
            setLoading(true);

            const response = await fetch(`${API_URL}/api/agent/confirm`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ confirmationId: confirmation.id, approved })
            });

            const data = await response.json();
            if (!response.ok) {
                const error = new Error(data.error || "Confirmation request failed.");
                error.status = response.status;
                error.type = data.type;
                throw error;
            }

            if (data.status === "cancelled") {
                setConfirmation(null);
                setMessages((previous) => [...previous, { role: "assistant", content: "The action was cancelled." }]);
                return;
            }

            if (data.status === "confirmation_required") {
                setConfirmation(data.confirmation);
                return;
            }

            if (data.status === "completed") {
                setConfirmation(null);
                setMessages((previous) => [...previous, { role: "assistant", content: data.response }]);
                await loadConversations();
            }
        } catch (error) {
            console.error("Confirmation error:", error);

            const errorMessage =
                error.status === 429 || error.type === "QUOTA_EXHAUSTED"
                    ? SERVER_BUSY_MESSAGE
                    : error.message || "Failed to process the action.";

            setMessages((previous) => [...previous, { role: "error", content: errorMessage }]);
        } finally {
            setConfirming(false);
            setLoading(false);
        }
    };

    /* ----- Tech post actions ----- */

    const runTechPost = async (topic = "") => {
        try {
            setLoading(true);
            setNotice("Searching recent tech stories and creating a sourced draft with an image…");

            const response = await fetch(`${API_URL}/api/tech-post/drafts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic })
            });

            const data = await readTechPostResponse(response);
            if (!response.ok) throw new Error(data.error || "Could not create the technology post draft.");

            setTechDraft(data);
            setDraftCaption(data.caption);
            setNotice("Draft created. Review the sources, image, and caption before publishing.");
            await loadLinkedInStatus();
        } catch (error) {
            console.error("Technology post draft failed:", error);
            setNotice(error.message || "Could not create the technology post draft.");
        } finally {
            setLoading(false);
        }
    };

    const saveTechPostEdit = async () => {
        if (!techDraft || !draftCaption.trim() || loading) return;

        try {
            setLoading(true);

            const response = await fetch(`${API_URL}/api/tech-post/drafts/${techDraft.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ caption: draftCaption })
            });

            const data = await readTechPostResponse(response);
            if (!response.ok) throw new Error(data.error || "Could not save the draft.");

            setTechDraft(data);
            setDraftCaption(data.caption);
            setNotice("Your caption edits are saved. Approve this exact version when ready.");
        } catch (error) {
            setNotice(error.message || "Could not save the draft.");
        } finally {
            setLoading(false);
        }
    };

    const rejectTechPost = async () => {
        if (!techDraft || loading) return;

        try {
            setLoading(true);

            const response = await fetch(`${API_URL}/api/tech-post/drafts/${techDraft.id}/reject`, {
                method: "POST"
            });

            const data = await readTechPostResponse(response);
            if (!response.ok) throw new Error(data.error || "Could not reject the draft.");

            setTechDraft(null);
            setDraftCaption("");
            setNotice("Draft rejected. It will not be published.");
        } catch (error) {
            setNotice(error.message || "Could not reject the draft.");
        } finally {
            setLoading(false);
        }
    };

    const publishTechPost = async () => {
        if (!techDraft || !linkedInStatus.connected || draftCaption !== techDraft.caption || loading) return;

        try {
            setLoading(true);
            setNotice("Publishing the version you approved…");

            const response = await fetch(`${API_URL}/api/tech-post/drafts/${techDraft.id}/publish`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ approved: true })
            });

            const data = await readTechPostResponse(response);
            if (!response.ok) throw new Error(data.error || "LinkedIn could not publish this draft.");

            setTechDraft((current) => ({ ...current, status: "posted", postUrn: data.postUrn }));
            setNotice("Published to LinkedIn.");
        } catch (error) {
            setNotice(error.message || "LinkedIn could not publish this draft.");
            await loadTechDraft();
        } finally {
            setLoading(false);
        }
    };

    /* ----- UI helpers ----- */

    const handleKeyDown = (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    };

    const copyMessage = async (content) => {
        try {
            await navigator.clipboard.writeText(content);
            setNotice("Copied to clipboard.");
            window.setTimeout(() => setNotice(""), 1800);
        } catch (error) {
            console.error("Copy failed:", error);
            setNotice("Clipboard access is unavailable in this browser.");
        }
    };

    const formatConfirmationDetails = () => {
        if (!confirmation?.arguments) return "";

        return Object.entries(confirmation.arguments)
            .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`)
            .join("\n");
    };

    const choosePrompt = (prompt) => {
        setMessage(prompt);
        messageInputRef.current?.focus();
    };

    // Chat names are blurred by default; these reveal/hide them
    const allChatsRevealed =
        conversations.length > 0 && conversations.every((conversation) => revealedChats.has(conversation.id));

    const toggleChatName = (id) => {
        setRevealedChats((previous) => {
            const next = new Set(previous);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAllChatNames = () => {
        setRevealedChats(allChatsRevealed ? new Set() : new Set(conversations.map((conversation) => conversation.id)));
    };

    const deleteChat = async (id) => {
        if (!window.confirm("Delete this chat? This can't be undone.")) return;

        try {
            const response = await fetch(`${API_URL}/api/conversations/${id}`, { method: "DELETE" });
            if (!response.ok) throw new Error("Could not delete this chat.");

            setConversations((previous) => previous.filter((conversation) => conversation.id !== id));
            setRevealedChats((previous) => {
                const next = new Set(previous);
                next.delete(id);
                return next;
            });
            if (id === conversationId) newChat();
        } catch (error) {
            console.error("Failed to delete conversation:", error);
            setNotice("Could not delete this chat. Please try again.");
        }
    };

    const confirmationDetails = formatConfirmationDetails();

    /* ----- Render ----- */

    return (
        <div className={`app-shell ${sidebarOpen ? "" : "sidebar-closed"}`}>
            {/* ===== Sidebar toggle (stays in the top-left corner) ===== */}
            <button
                className="sidebar-toggle"
                onClick={() => setSidebarOpen((open) => !open)}
                aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
                aria-expanded={sidebarOpen}
                title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="16" rx="3" />
                    <path d="M9.5 4v16" />
                </svg>
            </button>
            {/* ===== Sidebar ===== */}
            <aside className="sidebar">
                <div className="sidebar-top">
                    <a className="brand" href="#main" aria-label="Tuesday AI home">
                        <span>
                            Tuesday <b>AI</b>
                        </span>
                    </a>

                    <button className="new-chat" onClick={newChat}>
                        <span className="new-chat-plus" aria-hidden="true">＋</span>
                        <span>New chat</span>
                        <kbd>Ctrl K</kbd>
                    </button>
                </div>

                <div className="history-heading">
                    <span className="history-label">
                        Recent chats <span className="history-count">{conversations.length}</span>
                    </span>
                    {conversations.length > 0 && (
                        <button className="view-all" onClick={toggleAllChatNames}>
                            {allChatsRevealed ? "Hide all" : "View all"}
                        </button>
                    )}
                </div>

                <nav className="conversation-list" aria-label="Recent chats">
                    {conversations.length === 0 ? (
                        <p className="empty-sidebar">Your conversations will appear here.</p>
                    ) : (
                        conversations.map((conversation) => {
                            const revealed = revealedChats.has(conversation.id);
                            return (
                                <div
                                    key={conversation.id}
                                    className={`conversation-item ${conversation.id === conversationId ? "active" : ""}`}
                                >
                                    <button
                                        className="conversation-delete"
                                        onClick={() => deleteChat(conversation.id)}
                                        aria-label="Delete chat"
                                        title="Delete chat"
                                    >
                                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <path d="M3 6h18" />
                                            <path d="M8 6V4h8v2" />
                                            <path d="M6 6l1 14h10l1-14" />
                                            <path d="M10 11v5M14 11v5" />
                                        </svg>
                                    </button>

                                    <button
                                        className="conversation-open"
                                        onClick={() => loadConversation(conversation.id)}
                                        title={revealed ? conversation.title : undefined}
                                        aria-label={revealed ? conversation.title : "Open chat (title hidden)"}
                                    >
                                        <span className="conversation-icon" aria-hidden="true" />
                                        <span className={`conversation-title ${revealed ? "" : "is-blurred"}`}>
                                            {conversation.title}
                                        </span>
                                    </button>

                                    <button
                                        className="conversation-view"
                                        onClick={() => toggleChatName(conversation.id)}
                                        aria-pressed={revealed}
                                    >
                                        {revealed ? "Hide" : "View"}
                                    </button>
                                </div>
                            );
                        })
                    )}
                </nav>

                <div className="sidebar-footer">
                    <div className="footer-mark" aria-hidden="true">T</div>
                    <div className="footer-copy">
                        <strong>Tuesday AI</strong>
                        <span>Your personal agent</span>
                    </div>
                    <span className="footer-spark" aria-hidden="true">✦</span>
                </div>
            </aside>

            {/* ===== Main workspace ===== */}
            <main className="workspace" id="main">
                <header className="topbar">
                    <div className="topbar-context">
                        <span className="context-dot" /> Personal workspace
                    </div>
                    <div className="topbar-right">
                        <span className="topbar-label">Tuesday AI</span>
                        <span className="topbar-avatar">T</span>
                    </div>
                </header>

                <div className="dashboard-grid">
                    {/* ----- Conversation ----- */}
                    <section className="conversation-stage" aria-label="Chat with Tuesday AI">
                        <div className={`chat-scroll ${messages.length === 0 && !techDraft ? "is-welcome" : ""}`}>
                            {messages.length === 0 ? (
                                <div className="welcome">
                                    <div className="wave-art" aria-hidden="true">
                                        <svg viewBox="0 0 520 120" preserveAspectRatio="none">
                                            {Array.from({ length: 7 }, (_, index) => {
                                                const offset = index * 4.5;
                                                return (
                                                    <path
                                                        key={index}
                                                        d={`M0 ${60 + offset} C92 ${60 + offset}, 112 ${60 - 52 + offset}, 177 ${60 - 28 + offset} S259 ${60 + 44 - offset}, 323 ${60 - 4 + offset} S418 ${60 + 40 - offset}, 520 ${60 + offset}`}
                                                    />
                                                );
                                            })}
                                        </svg>
                                    </div>

                                    <p className="eyebrow">YOUR PERSONAL AI AGENT</p>
                                    <h1>
                                        {greetingForTime()}
                                        <br />
                                        <span>What’s on your mind?</span>
                                    </h1>
                                    <div className="sun-logo" aria-hidden="true">
                                        <img className="sun-rays" src={sunRays} alt="" draggable="false" />
                                        <img className="sun-core" src={sunCore} alt="" draggable="false" />
                                    </div>
                                </div>
                            ) : (
                                <div className="message-list">
                                    {messages.map((msg, index) => (
                                        <article key={`${index}-${msg.role}`} className={`message ${msg.role}`}>
                                            <div className="message-avatar" aria-hidden="true">
                                                {msg.role === "user" ? "Y" : msg.role === "assistant" ? <span className="mini-mark" /> : "!"}
                                            </div>

                                            <div className="message-content">
                                                <div className="message-meta">
                                                    <span>
                                                        {msg.role === "user" ? "You" : msg.role === "assistant" ? "Tuesday AI" : "Notice"}
                                                    </span>
                                                </div>

                                                <div className="bubble">
                                                    {msg.role === "error" ? (
                                                        <div className="error-message">{msg.content}</div>
                                                    ) : (
                                                        <ReactMarkdown
                                                            remarkPlugins={[remarkGfm]}
                                                            components={{
                                                                code({ inline, className, children, ...props }) {
                                                                    if (inline) {
                                                                        return (
                                                                            <code className="inline-code" {...props}>
                                                                                {children}
                                                                            </code>
                                                                        );
                                                                    }
                                                                    return (
                                                                        <div className="code-block">
                                                                            <button
                                                                                className="copy-code"
                                                                                onClick={() => copyMessage(String(children))}
                                                                            >
                                                                                Copy
                                                                            </button>
                                                                            <pre>
                                                                                <code className={className} {...props}>
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

                                                {msg.role === "assistant" && (
                                                    <button className="copy-message" onClick={() => copyMessage(msg.content)}>
                                                        Copy response
                                                    </button>
                                                )}
                                            </div>
                                        </article>
                                    ))}

                                    {confirmation && (
                                        <section className="confirmation-card" aria-live="polite">
                                            <div className="confirmation-symbol">!</div>
                                            <div className="confirmation-content">
                                                <p className="confirmation-kicker">ACTION NEEDS YOUR APPROVAL</p>
                                                <h2>{formatToolName(confirmation.tool)}</h2>
                                                <p className="confirmation-description">
                                                    Tuesday AI is asking before it changes or removes saved information.
                                                </p>

                                                {confirmationDetails && (
                                                    <pre className="confirmation-details">{confirmationDetails}</pre>
                                                )}

                                                <div className="confirmation-buttons">
                                                    <button
                                                        className="confirmation-cancel"
                                                        onClick={() => handleConfirmation(false)}
                                                        disabled={confirming}
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        className="confirmation-approve"
                                                        onClick={() => handleConfirmation(true)}
                                                        disabled={confirming}
                                                    >
                                                        {confirming ? "Working…" : "Approve action"}
                                                    </button>
                                                </div>
                                            </div>
                                        </section>
                                    )}

                                    {loading && !confirmation && <WorkingIndicator conversationId={conversationId} />}

                                    <div ref={messagesEndRef} />
                                </div>
                            )}

                            {/* LinkedIn tech post draft */}
                            {techDraft && (
                                <section className="tech-post-draft" aria-label="LinkedIn post draft">
                                    <div className="draft-header">
                                        <div>
                                            <p className="draft-kicker">TECH STORY · LINKEDIN DRAFT</p>
                                            <h2>{techDraft.headline}</h2>
                                        </div>
                                        <span className={`draft-status ${techDraft.status}`}>
                                            {statusLabel(techDraft.status)}
                                        </span>
                                    </div>

                                    <img
                                        className="draft-image"
                                        src={`${API_URL}${techDraft.imageUrl}`}
                                        alt={`Generated editorial image for ${techDraft.headline}`}
                                    />

                                    <label className="draft-caption-label" htmlFor="tech-post-caption">
                                        Post caption
                                    </label>
                                    <textarea
                                        id="tech-post-caption"
                                        className="draft-caption"
                                        value={draftCaption}
                                        onChange={(event) => setDraftCaption(event.target.value)}
                                        disabled={techDraft.status !== "pending_approval" || loading}
                                    />

                                    <div className="draft-sources">
                                        <strong>Sources</strong>
                                        {techDraft.sources.map((source) => (
                                            <a href={source.url} key={source.url} target="_blank" rel="noreferrer">
                                                <span className="draft-source-title">{source.title}</span>
                                                <time>
                                                    {source.publishedAt
                                                        ? new Date(source.publishedAt).toLocaleDateString("en-IN", {
                                                              day: "numeric",
                                                              month: "short",
                                                              year: "numeric"
                                                          })
                                                        : "Date not listed"}
                                                </time>
                                                <span aria-hidden="true">↗</span>
                                            </a>
                                        ))}
                                    </div>

                                    {techDraft.errorMessage && <p className="draft-warning">{techDraft.errorMessage}</p>}

                                    {techDraft.status === "pending_approval" && (
                                        <div className="draft-actions">
                                            {draftCaption !== techDraft.caption && (
                                                <button
                                                    className="draft-save"
                                                    onClick={saveTechPostEdit}
                                                    disabled={!draftCaption.trim() || loading}
                                                >
                                                    Save edits
                                                </button>
                                            )}

                                            <button className="draft-reject" onClick={rejectTechPost} disabled={loading}>
                                                Reject
                                            </button>

                                            {linkedInStatus.connected ? (
                                                <button
                                                    className="draft-publish"
                                                    onClick={publishTechPost}
                                                    disabled={loading || draftCaption !== techDraft.caption}
                                                >
                                                    Approve &amp; publish
                                                </button>
                                            ) : linkedInStatus.configured ? (
                                                <a className="draft-connect" href={`${API_URL}/api/linkedin/connect`}>
                                                    Connect LinkedIn
                                                </a>
                                            ) : (
                                                <p className="draft-setup">
                                                    LinkedIn publishing is not configured. Add the LinkedIn app credentials before a publish approval can be offered.
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {techDraft.status === "posted" && (
                                        <p className="draft-posted-id">Published post: {techDraft.postUrn}</p>
                                    )}

                                    {techDraft.status === "needs_review" && (
                                        <p className="draft-setup">
                                            The publish request may have reached LinkedIn, but its response was unclear. This draft is locked to prevent duplicate posting; check LinkedIn before retrying.
                                        </p>
                                    )}
                                </section>
                            )}
                        </div>

                        {/* Composer */}
                        <div className="composer-area">
                            {notice && (
                                <div className="notice" role="status">
                                    {notice}
                                </div>
                            )}

                            <div className="composer">
                                <textarea
                                    ref={messageInputRef}
                                    rows={1}
                                    placeholder="Ask Tuesday AI anything… (try /techpost)"
                                    value={message}
                                    onChange={(event) => setMessage(event.target.value)}
                                    onKeyDown={handleKeyDown}
                                    disabled={loading || confirming}
                                    aria-label="Message Tuesday AI"
                                />

                                <div className="composer-bottom">
                                    <span className="composer-hint">
                                        Enter to send <span>·</span> Shift + Enter for a new line
                                    </span>
                                    <button
                                        className="send-button"
                                        onClick={sendMessage}
                                        disabled={loading || confirming || !message.trim()}
                                        aria-label="Send message"
                                    >
                                        <span aria-hidden="true">↑</span>
                                    </button>
                                </div>
                            </div>

                            <p className="privacy-note">Tuesday AI can make mistakes. Check important information.</p>
                        </div>
                    </section>

                    {/* ----- Right rail ----- */}
                    <aside className="insight-rail" aria-label="Tuesday AI capabilities">
                        <TodoCard />

                        {/* Prompt shortcuts, styled as the Agent toolkit */}
                        <section className="rail-card tools-card">
                            <div className="rail-card-heading">
                                <div className="heading-with-icon">
                                    <span className="rail-heading-icon">⌘</span>
                                    <h2>Agent toolkit</h2>
                                </div>
                                <span className="tool-count">{promptCards.length}</span>
                            </div>

                            <div className="tool-list">
                                {promptCards.map((card) => (
                                    <button
                                        className="tool-row"
                                        key={card.title}
                                        onClick={() => choosePrompt(card.prompt)}
                                    >
                                        <span className="tool-icon" aria-hidden="true">{card.icon}</span>
                                        <span className="tool-copy">
                                            <strong>{card.title}</strong>
                                            <small>{card.description}</small>
                                        </span>
                                        <span className="tool-arrow" aria-hidden="true">↗</span>
                                    </button>
                                ))}
                            </div>

                            <p className="tool-footnote">
                                Click one to fill the message box. Sensitive changes ask you first.
                            </p>
                        </section>

                        <section className="rail-card memory-card">
                            <div className="rail-card-heading">
                                <div className="heading-with-icon">
                                    <span className="rail-heading-icon">◈</span>
                                    <h2>Built for continuity</h2>
                                </div>
                            </div>

                            <p>Tuesday can save useful details and find them again when you need them.</p>

                            <button
                                className="memory-prompt"
                                onClick={() =>
                                    choosePrompt("What do you remember about me? Search my saved memories and summarize them.")
                                }
                            >
                                Ask about my memories <span aria-hidden="true">→</span>
                            </button>
                        </section>

                        <div className="rail-footer">
                            <span className="rail-footer-dot" /> Powered by your Tuesday AI agent
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
}

export default App;