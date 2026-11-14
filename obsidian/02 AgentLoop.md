# 🔄 Agent Loop

## What is an Agent Loop?

An agent loop allows the AI to:

1. Understand the request
2. Decide whether it needs a tool
3. Call the tool
4. Receive the result
5. Think again
6. Use another tool if necessary
7. Give the final answer

---

## Basic Flow

User
↓
Gemini
↓
Need a tool?
├── No → Final answer
└── Yes
      ↓
   Execute tool
      ↓
   Tool result
      ↓
   Gemini again
      ↓
   Need another tool?
      ↓
   Final answer

---

## Example

User:

"What is my main AI project?"

Gemini:

"I need to search memory."

↓ 

searchMemory()

↓

MySQL returns information.

↓

Gemini receives the result.

↓

Gemini answers the user.

---

## Important

The AI is not directly accessing MySQL or the internet.

Gemini requests a tool.

Node.js executes the tool.

The result is then returned to Gemini.


## Related Notes

[[01 - Architecture]]
[[03 - Tool Calling]]
[[04 - Memory]]