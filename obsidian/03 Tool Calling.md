# 🔧 Tool Calling

## What is a Tool?

A tool is a function that gives the AI an ability it doesn't have by itself.

Examples:

- getCurrentTime()
- searchWeb()
- saveMemory()
- searchMemory()

---

## Why Do We Need Tools?

An AI model can generate text, but it shouldn't be expected to:

- Know the current time
- Search the live internet
- Access our database
- Send emails
- Modify files

Tools give the agent these abilities.

---

## Example

User:

"What time is it?"

Gemini decides:

getCurrentTime()

Node.js executes:

getCurrentTime()

↓

Returns current time.

↓

Gemini receives result.

↓

Gemini answers user.

---

## Tool Registry

Our tools are stored in a central registry.

Current tools:

- getCurrentTime
- searchWeb
- saveMemory
- searchMemory

This makes it easy to add new tools later.

---

## Future Tools

Possible future tools:

- sendEmail
- readEmail
- createCalendarEvent
- readFile
- writeFile
- createTask
- deleteFile
- runCode

Dangerous tools should require confirmation.

## Related Notes

[[02 - Agent Loop]]
[[04 - Memory]]
[[06 - Web Research]]