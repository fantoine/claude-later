---
name: later:config
description: "Show the current persistence configuration for the later-queue in this project"
disable-model-invocation: false
---

Run `pwd` to get the current working directory. Then call the later_config_get MCP tool with that cwd.

Present the result clearly:
- Which backend is active (json or markdown)
- Where the config comes from (env var / local project config / global config / default)
- Where queue files are stored on disk

If the backend is the default json and no config file exists, also tell the user they can change it with /later:config-set.
