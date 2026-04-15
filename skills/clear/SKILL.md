---
name: later:clear
description: "Clear all actions from the later-queue at once"
disable-model-invocation: false
---

Before calling the tool, run `pwd` to get the current working directory.

Ask the user for confirmation before proceeding — show how many items are currently in the queue by calling later_list first.

If the queue is empty, say so and stop.

Otherwise, ask: "This will remove all X actions from the queue. Are you sure?"

If confirmed, call later_clear with the cwd parameter and confirm the queue has been cleared.
