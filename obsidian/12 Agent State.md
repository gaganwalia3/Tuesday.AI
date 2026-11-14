# Agent State

Agent state is responsible for tracking what Nexus is currently doing while executing a user request.

## Why Agent State Exists

A normal chatbot can follow:

User → LLM → Answer

An agent can follow:

User
↓
LLM
↓
Tool
↓
Tool Result
↓
LLM
↓
Another Tool
↓
Tool Result
↓
Final Answer

Because execution can involve multiple steps, Nexus needs state.

---

## Current Agent State Responsibilities

The state layer helps track:

- current execution status
- current iteration
- tool execution history
- tool calls already performed
- confirmation state
- pending actions
- maximum execution iterations

---

## Agent Execution States

Conceptually Nexus can be in states such as:

```text
IDLE
 ↓
THINKING
 ↓
TOOL_REQUESTED
 ↓
TOOL_EXECUTING
 ↓
TOOL_RESULT
 ↓
THINKING
 ↓
CONFIRMATION_REQUIRED
 ↓
WAITING
 ↓
EXECUTING
 ↓
COMPLETED