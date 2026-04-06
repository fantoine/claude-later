---
description: "Add a deferred action to the later-queue"
---

Use the later_push MCP tool to add an action to the later-queue.

The action text is: $ARGUMENTS

If no arguments were provided, ask the user what action they want to defer.

If the current conversation has relevant context (current task, file being edited, topic being discussed), include a short summary as the context parameter.

Confirm to the user that the action has been added, showing the action text and its short ID.
