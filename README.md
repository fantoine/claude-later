<div align="center">
  <img src="extension/icon.svg" width="96" height="96" />

  # Later

  **Capture what matters without losing your focus.**

  ![version](https://img.shields.io/badge/version-0.2.3-6c63ff)
  ![license](https://img.shields.io/badge/license-Apache%202.0-blue)
</div>

---

Later lets you defer actions mid-conversation without interrupting your current task. Spot a bug to fix, an idea to explore, or a refactor to do? Push it to the queue and come back to it when you're ready — with full context preserved.

<details>
<summary><strong>Example: deferring a task while working on a feature</strong></summary>

You're deep in a refactor when you notice something unrelated.

**Claude Code:**

```
/later:add Fix the error handling in the auth middleware — it swallows 500s silently
```

**Claude Desktop:**

> "Save this for later: fix the error handling in the auth middleware — it swallows 500s silently"

> Added to later-queue (id: `3f8a1c22`)
> Action: Fix the error handling in the auth middleware — it swallows 500s silently

Later finishes your refactor. When you're ready:

**Claude Code:**

```
/later:next
```

**Claude Desktop:**

> "Process the next item in my later queue"

> **Fix the error handling in the auth middleware — it swallows 500s silently**
> Context: Noticed while refactoring the user service

Claude picks it up and starts working on it immediately.

</details>

## 💡 Why?

Context-switching is expensive. When you notice something worth doing mid-task, you either stop what you're doing (losing focus) or forget about it entirely. Later gives you a third option: capture it instantly, stay focused, and process it when the time is right.

Useful for:
- **Bug triage** -- note issues as you find them without stopping to fix them
- **Refactor backlog** -- queue improvements to revisit after the current task
- **Ideas and follow-ups** -- capture anything that comes up mid-conversation
- **Cross-session continuity** -- the queue persists between Claude Code sessions

## 📦 Installation

Later is available as a **Claude Code plugin** and as a **Claude Desktop extension**.

### Claude Code

```bash
claude plugin marketplace add fantoine/claude-plugins
claude plugin install later --scope user
```

The `--scope` flag controls where the plugin is available:

| Scope | Effect |
|-------|--------|
| `user` | Available in all your projects (recommended) |
| `project` | Only in the current project |
| `local` | Only in the current project, not committed to git |

We recommend `user` scope so Later is available everywhere.

### Claude Desktop

Download the latest `.mcpb` file from the [Releases page](https://github.com/fantoine/claude-later/releases/latest), then double-click it to install.

## 🚀 Getting started

### Add an action

**Claude Code:**

```
/later:add <action>
```

**Claude Desktop:**

> "Save this for later: investigate why the pagination breaks on the reports page"

Claude captures the action and any relevant context from the current conversation automatically.

### Process the next action

**Claude Code:**

```
/later:next
```

**Claude Desktop:**

> "What's next in my later queue?"

Retrieves and removes the first item from the queue, then executes it immediately.

### Pick a specific action

**Claude Code:**

```
/later:pick <id or natural language reference>
```

Accepts an ID, a position, or a description:

```
/later:pick 3f8a1c22
/later:pick the second one
/later:pick the last added
```

**Claude Desktop:**

> "Pick the second item from my later queue and work on it"

> "Work on the one about the pagination bug"

### View the queue

**Claude Code:**

```
/later:list
```

**Claude Desktop:**

> "Show me everything in my later queue"

Shows all pending actions with their date and context.

## 🗂️ Storage

Later stores the queue in a JSON file. The location depends on the context:

| Context | Storage path |
|---------|-------------|
| Claude Code (inside a project with `.claude/`) | `.claude/later-queue.local.json` in the project root |
| Claude Code (outside a project) or Claude Desktop | `~/.claude/later-queue.json` |

The queue persists across sessions and is scoped per-project when used inside a Claude Code project.

## ⚡ Commands reference

**Claude Code:**

| Command | Description |
|---------|-------------|
| `/later:add <action>` | Add an action to the queue |
| `/later:next` | Retrieve and execute the next action |
| `/later:pick <ref>` | Pick a specific action by ID or natural language |
| `/later:list` | Show all pending actions |

**Claude Desktop** exposes the same capabilities via MCP tools. Just ask in natural language:

| Tool | Example prompt |
|------|---------------|
| `later_push` | "Save this for later: investigate the memory leak in the worker" |
| `later_pop` | "What's next in my later queue?" |
| `later_pick` | "Pick the second item from my later queue and work on it" |
| `later_list` | "Show me everything in my later queue" |
| `later_remove` | "Remove item 3f8a1c22 from my later queue" |

## License

Apache 2.0
