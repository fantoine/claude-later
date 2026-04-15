---
name: later:remove
description: "Remove one or more specific actions from the later-queue"
disable-model-invocation: false
---

The argument is: $ARGUMENTS

Before calling any tool, run `pwd` to get the current working directory.

Start by calling later_list with the cwd parameter to retrieve all actions currently in the queue.

If the queue is empty, say so and stop.

Then resolve which items to remove from the argument:
- If it looks like one or more IDs (hex strings, space or comma separated), match them directly against the list.
- If it is a natural language reference (e.g. "the first one", "items 1 and 3", "the last two", "all except the second"), resolve the references to the corresponding items by position or description.
- If no argument was provided, show the list and ask the user which items to remove.
- If the reference is ambiguous or cannot be resolved, show the list and ask for clarification.

Once the target items are identified, call later_remove once per item with its ID and the cwd parameter.

Confirm to the user which actions were removed, showing their action text.
