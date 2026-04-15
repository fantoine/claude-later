---
name: later:next
description: "Retrieve and process the next action from the later-queue"
disable-model-invocation: false
---

Before calling the tool, run `pwd` to get the current working directory.

Use the later_pop MCP tool to retrieve the next action from the later-queue, passing the working directory as the cwd parameter.

If the queue is empty, say so.

Otherwise, execute the action immediately without asking for confirmation — treat it as if the user had typed it directly.
