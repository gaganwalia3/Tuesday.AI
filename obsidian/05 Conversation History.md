# 💬 Conversation History

## Why?

The assistant needs to understand the current conversation.

Example:

User:

"My name is Gagan."

AI:

"Nice to meet you."

User:

"What is my name?"

AI:

"Your name is Gagan."

---

## Frontend

React stores the current conversation.

Messages look like:

{
    role: "user",
    content: "Hello"
}

or:

{
    role: "assistant",
    content: "Hello! How can I help?"
}

---

## Backend

The frontend sends the conversation to Express.

Express sends it to:

runAgent(messages)

---

## Gemini Format

Our frontend uses:

assistant

Gemini uses:

model

So the backend converts:

assistant → model

---

## Important Lesson

Conversation history is not the same as tool execution history.

Conversation:

User
↓
Assistant
↓
User
↓
Assistant

Agent execution:

User
↓
Model
↓
Function Call
↓
Tool
↓
Function Response
↓
Model
↓
Final Answer

These need to be handled correctly.




## Related Notes

[[01 - Architecture]]
[[04 - Memory]]


## Persistent Conversation

Conversation history is stored in MySQL.

Tables:

- conversations
- messages

Relationship:

Conversation
↓
Many Messages

This means conversations can survive a browser refresh.

[[04 - Memory]]
[[01 - Architecture]]