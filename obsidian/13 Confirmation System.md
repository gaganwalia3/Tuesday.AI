
---

# 2. `13 Confirmation System.md`

This is one of the most important notes.

```markdown
# Confirmation System

The confirmation system prevents Nexus from performing potentially dangerous or external actions without explicit user approval.

## Why Confirmation Exists

Nexus is intended to become an agent capable of performing real-world actions.

Examples:

- sending an email
- deleting a task
- deleting memory
- creating a calendar event
- publishing a LinkedIn post
- modifying GitHub resources

A normal chatbot only produces text.

An agent can change things.

Therefore Nexus needs a permission boundary.

---

# Core Principle

> Nexus may reason freely, but risky side effects require explicit user approval.

---

# Confirmation Flow

```text
User Request
     ↓
Gemini
     ↓
Tool Call
     ↓
Tool Registry
     ↓
Does tool require confirmation?
     │
   ┌─┴─┐
   │   │
  NO  YES
   │   │
   │   ↓
   │ Create Pending Action
   │   ↓
   │ Pause Agent
   │   ↓
   │ Return confirmation_required
   │   ↓
   │ Frontend
   │   ↓
   │ User
   │   │
   │ ┌─┴────────┐
   │ │          │
   │Cancel    Approve
   │ │          │
   │ ↓          ↓
   │ Delete   Resume Agent
   │          ↓
   │       Execute Tool
   │          ↓
   │       Tool Result
   │          ↓
   │       Gemini
   │          ↓
   │       Final Answer
   │
   ↓
Execute Tool
   ↓
Tool Result
   ↓
Gemini