---
name: later:config-set
description: "Set the persistence backend for the later-queue in this project"
disable-model-invocation: false
---

Run `pwd` to get the current working directory.

Arguments: $ARGUMENTS

Parse the arguments to extract:
- backend: "json" or "markdown" (required)
- dir: optional custom directory for the markdown backend (e.g. "dir=my/path" or "--dir my/path")

If no backend argument is provided, ask the user which backend they want (json or markdown). If they choose markdown, ask if they want a custom directory.

Call later_config_set with:
- backend: the chosen backend
- dir: the custom dir, if specified
- cwd: the current working directory (so the config is written locally to this project)

Confirm what was written and where. Remind the user that the env var LATER_STORAGE takes precedence over the config file if set.
