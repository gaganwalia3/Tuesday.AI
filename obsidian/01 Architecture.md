# 🏗️ Architecture

## Overall Architecture

Browser
↓
React
↓
Express API
↓
Agent
↓
Gemini
↓
Tools
├── Web Search
├── Memory
├── Current Time
└── Future Tools

---

## Frontend

React is responsible for:

- Chat interface
- Displaying messages
- Taking user input
- Sending requests to the backend
- Displaying AI responses

---

## Backend

Node.js + Express are responsible for:

- Receiving requests from React
- Running the agent
- Calling Gemini
- Executing tools
- Connecting to MySQL
- Keeping API keys secret

---

## AI

Gemini is the reasoning engine.

It decides:

- What the user wants
- Whether a tool is needed
- Which tool to use
- What arguments to give the tool
- Whether more information is needed
- When to give the final answer

---

## Database

MySQL stores long-term memory.

Database:

personal_ai

Table:

memories

---

## Web Search

Tavily provides web search.

This allows the assistant to obtain current information instead of relying only on the AI's existing knowledge.

---

## Important Security Rule

API keys and database credentials must stay on the backend.

The React frontend should never contain:

- GEMINI_API_KEY
- TAVILY_API_KEY
- MySQL password
## Related Notes

[[02 - Agent Loop]]
[[03 - Tool Calling]]
[[04 - Memory]]
[[06 - Web Research]]