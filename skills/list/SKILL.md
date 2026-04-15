---
name: later:list
description: "Show all actions in the later-queue"
disable-model-invocation: false
---

Before calling the tool, run `pwd` to get the current working directory.

Use the later_list MCP tool to display all actions currently in the later-queue, passing the working directory as the cwd parameter.

Present the results clearly. If the queue is empty, say so.

Then briefly remind the user of available commands:
- /later:add <action> — add an action to the queue
- /later:next — retrieve and process the next action
- /later:pick <id or position> — pick a specific action to execute
- /later:remove <id or description> — remove one or more actions without executing them
- /later:clear — empty the entire queue
- /later:list — show this list
