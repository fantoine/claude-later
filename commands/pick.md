---
description: "Pick a specific action from the later-queue by ID and execute it"
---

The argument is: $ARGUMENTS

Start by calling later_list to retrieve all actions currently in the queue.

Then resolve the target action from the argument:
- If it looks like an ID (hex string), match it directly against the list.
- If it is a natural language reference (e.g. "the first one", "the 3rd", "the last one", "second item"), resolve it to the corresponding item in the list by position or description.
- If no argument was provided, show the list and ask the user which action to pick.
- If the reference is ambiguous or cannot be resolved, show the list and ask for clarification.

Once the target item is identified, call later_pick with its ID to remove it from the queue, then execute the action immediately without asking for confirmation — treat it as if the user had typed it directly.
