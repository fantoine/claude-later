---
description: "Retrieve and process the next action from the later-queue"
---

Use the later_pop MCP tool to retrieve the next action from the later-queue.

Always pass the current working directory as the cwd parameter.

If the queue is empty, say so.

Otherwise, execute the action immediately without asking for confirmation — treat it as if the user had typed it directly.
