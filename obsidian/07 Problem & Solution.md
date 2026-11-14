# 🐛 Problems & Solutions

## Gemini Model Error

### Problem

The original Gemini model was unavailable.

### Solution

Updated the model to the available Gemini model.

---

## Gemini Quota Error

### Problem

Received:

429 RESOURCE_EXHAUSTED

### Meaning

The API quota/rate limit was exceeded.

### Lesson

API access and API quota are different things.

---

## Tavily Package Missing

### Problem

Cannot find module:

@tavily/core

### Solution

Installed:

npm install @tavily/core

---

## MySQL Authentication

### Problem

Access denied for user 'root'@'localhost'

### Solution

Used the correct MySQL root password.

---

## Conversation History Error

### Problem

Gemini returned an INVALID_ARGUMENT error related to content parts.

### Cause

We mixed normal conversation history with Gemini's internal function-call/function-response context.

### Solution

Preserved Gemini's complete response content when continuing the agent tool loop.

### Lesson

Conversation history and agent execution history are different concepts.







---

# 11. Update `07 Problem & Solutions.md`

Add this section:

```markdown
---

# Recent Problems & Solutions

## Missing pendingActions module

### Problem

The server initially failed with:

```text
Cannot find module './agent/pendingActions'