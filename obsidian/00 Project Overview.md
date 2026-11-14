# 🤖 Personal AI Assistant

## Goal

Build my own personal AI assistant that can:

- Give me the latest AI news
- Tell me what's happening in the world
- Research topics for me
- Remember important information about me
- Perform tasks
- Eventually automate workflows
- Eventually support voice interaction

---

## Why I'm Building It

I don't want to simply use an existing AI assistant.

I want to understand how an agentic AI system actually works by building one myself.

---

## Current Status

The assistant currently has:

- Gemini as the AI brain
- Node.js backend
- React web interface
- Express API
- Tavily web search
- MySQL long-term memory
- Tool calling
- Agent loop
- Conversation history

---

## Main Goal

Turn this into a useful personal AI assistant that I can actually use every day.

## Project Notes

[[01 - Architecture]]
[[02 - Agent Loop]]
[[03 - Tool Calling]]
[[04 - Memory]]
[[05 - Conversation History]]
[[06 - Web Research]]
[[07 - Problems & Solutions]]
[[08 - Future Roadmap]]






---

# Current Project State

Nexus has now evolved beyond a basic chatbot into an agent architecture.

## Agent

The agent can:

- receive a user goal
- reason using Gemini
- select tools
- execute tools
- inspect tool results
- perform multi-step workflows
- maintain execution state
- detect risky actions
- pause for confirmation
- resume after approval

See [[02 Agent Loop]] and [[12 Agent State]].

## Tools

Current tool categories include:

- web research
- memory
- tasks
- time/date utilities
- calculation/conversion utilities

See [[03 Tool Calling]].

## Safety

Potentially destructive or external actions use the confirmation system.

See [[13 Confirmation System]].

## Frontend

The React frontend now supports:

- chat
- conversation history
- Markdown
- code blocks
- loading states
- confirmation cards
- Approve / Cancel actions

See [[15 Frontend Architecture]].

## Next Major Milestone

[[16 Gmail Integration]]

After Gmail:

```text
Gmail
 ↓
Google Calendar
 ↓
GitHub
 ↓
LinkedIn
 ↓
Google Drive