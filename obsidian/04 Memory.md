# 🧠 Memory

## Why Memory?

Without memory, the AI forgets information when the program stops.

We want the assistant to remember useful information.

---

## Database

MySQL

Database:

personal_ai

Table:

memories

---

## Memory Structure

memories

- id
- content
- created_at

---

## Save Memory

The assistant can call:

saveMemory()

Example:

User:

"Remember that I'm building a personal AI assistant."

Gemini:

saveMemory()

↓

Node.js

↓

MySQL

↓

Memory stored permanently.

---

## Search Memory

The assistant can call:

searchMemory()

Example:

User:

"What is my main AI project?"

Gemini:

searchMemory("AI project")

↓

MySQL

↓

Memory returned.

↓

Gemini answers.

---

## Important Distinction

Conversation history and long-term memory are different.

Conversation history:

"What did we just talk about?"

Long-term memory:

"What do you remember about me?"

---

## Future Memory

Currently we use keyword search.

Eventually we can use:

Embeddings
+
Vector database

This will allow semantic memory.

Example:

Stored:

"I am building a personal AI assistant."

Search:

"What software project am I working on?"

The system should understand that these mean similar things.

## Related Notes

[[01 - Architecture]]
[[03 - Tool Calling]]
[[05 - Conversation History]]