#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { pushItem, popItem, listItems, pickItem, removeItem, clearQueue } from './queue.js';
import { loadConfig, writeLocalConfig, writeGlobalConfig, globalHome } from './storage/config.js';
import { existsSync } from 'node:fs';
import { join, isAbsolute } from 'node:path';

const VERSION = '0.1.0';

const server = new McpServer({
  name: 'later',
  version: VERSION,
});

server.tool(
  'later_push',
  'Add a deferred action to the later-queue. Use this when the user wants to save something for later without interrupting the current task.',
  {
    action: z.string().describe('The action or task to defer'),
    context: z.string().optional().describe('Additional context to remember alongside the action'),
    project: z.string().optional().describe('Project or topic identifier (useful for Claude Desktop where cwd is not meaningful)'),
    cwd: z.string().optional().describe('Current working directory of the Claude Code session'),
  },
  async ({ action, context, project, cwd }) => {
    const item = await pushItem(action, context, project, cwd);
    return {
      content: [
        {
          type: 'text',
          text: `Added to later-queue (id: ${item.id})\n\nAction: ${item.action}${item.context ? `\nContext: ${item.context}` : ''}${item.project ? `\nProject: ${item.project}` : ''}`,
        },
      ],
    };
  },
);

server.tool(
  'later_pop',
  'Retrieve and remove the next action from the later-queue (FIFO). Use this when the user is ready to process a deferred action.',
  {
    cwd: z.string().optional().describe('Current working directory of the Claude Code session'),
  },
  async ({ cwd }) => {
    const item = await popItem(cwd);
    if (!item) {
      return {
        content: [{ type: 'text', text: 'The later-queue is empty.' }],
      };
    }
    return {
      content: [
        {
          type: 'text',
          text: `Next action from later-queue:\n\nAction: ${item.action}${item.context ? `\nContext: ${item.context}` : ''}${item.project ? `\nProject: ${item.project}` : ''}\nAdded: ${item.createdAt}\nCwd: ${item.cwd}`,
        },
      ],
    };
  },
);

server.tool(
  'later_list',
  'List all actions currently in the later-queue.',
  {
    project: z.string().optional().describe('Filter by project name'),
    cwd: z.string().optional().describe('Current working directory of the Claude Code session'),
  },
  async ({ project, cwd }) => {
    const items = await listItems(project, cwd);
    if (items.length === 0) {
      const suffix = project ? ` for project "${project}"` : '';
      return {
        content: [{ type: 'text', text: `No actions in the later-queue${suffix}.` }],
      };
    }

    const lines = items.map((item, i) => {
      const date = new Date(item.createdAt).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
      const parts = [`${i + 1}. [${item.id.slice(0, 8)}] ${item.action}  (${date})`];
      if (item.context) parts.push(`   Context: ${item.context}`);
      if (item.project) parts.push(`   Project: ${item.project}`);
      return parts.join('\n');
    });

    return {
      content: [
        {
          type: 'text',
          text: `Later-queue (${items.length} item${items.length > 1 ? 's' : ''}):\n\n${lines.join('\n\n')}`,
        },
      ],
    };
  },
);

server.tool(
  'later_pick',
  'Retrieve and remove a specific action from the later-queue by its ID.',
  {
    id: z.string().describe('The ID of the action to pick (full UUID or first 8 characters)'),
    cwd: z.string().optional().describe('Current working directory of the Claude Code session'),
  },
  async ({ id, cwd }) => {
    const item = await pickItem(id, cwd);
    if (!item) {
      return {
        content: [{ type: 'text', text: `No action found with id "${id}".` }],
      };
    }
    return {
      content: [
        {
          type: 'text',
          text: `Picked from later-queue:\n\nAction: ${item.action}${item.context ? `\nContext: ${item.context}` : ''}${item.project ? `\nProject: ${item.project}` : ''}\nAdded: ${item.createdAt}\nCwd: ${item.cwd}`,
        },
      ],
    };
  },
);

server.tool(
  'later_remove',
  'Remove a specific action from the later-queue by its ID.',
  {
    id: z.string().describe('The ID of the action to remove (full UUID or first 8 characters)'),
    cwd: z.string().optional().describe('Current working directory of the Claude Code session'),
  },
  async ({ id, cwd }) => {
    const removed = await removeItem(id, cwd);
    if (!removed) {
      return {
        content: [{ type: 'text', text: `No action found with id "${id}".` }],
      };
    }
    return {
      content: [{ type: 'text', text: `Action "${id}" removed from the later-queue.` }],
    };
  },
);

server.tool(
  'later_clear',
  'Remove all actions from the later-queue at once.',
  {
    cwd: z.string().optional().describe('Current working directory of the Claude Code session'),
  },
  async ({ cwd }) => {
    const count = await clearQueue(cwd);
    return {
      content: [
        {
          type: 'text',
          text: count === 0
            ? 'The later-queue was already empty.'
            : `Cleared ${count} action${count > 1 ? 's' : ''} from the later-queue.`,
        },
      ],
    };
  },
);

server.tool(
  'later_config_get',
  'Show the current persistence configuration for the later-queue.',
  {
    cwd: z.string().optional().describe('Current working directory (Claude Code only)'),
  },
  async ({ cwd }) => {
    const effectiveCwd = cwd ?? process.cwd();
    const cfg = await loadConfig(effectiveCwd);

    // Determine source
    let source: string;
    if (process.env.LATER_STORAGE) {
      source = `env var LATER_STORAGE=${process.env.LATER_STORAGE}`;
    } else if (cwd && existsSync(join(cwd, '.claude', 'later.config.json'))) {
      source = `local config (${join(cwd, '.claude', 'later.config.json')})`;
    } else if (existsSync(join(globalHome(), '.claude', 'later.config.json'))) {
      source = `global config (${join(globalHome(), '.claude', 'later.config.json')})`;
    } else {
      source = 'default';
    }

    // Compute queue path
    let queuePath: string;
    if (cfg.backend === 'json') {
      const localDir = cwd ? join(cwd, '.claude') : null;
      queuePath = localDir && existsSync(localDir)
        ? join(localDir, 'later-queue.local.json')
        : join(globalHome(), '.claude', 'later-queue.json');
    } else {
      const configured = cfg.options?.dir;
      const localDir = cwd ? join(cwd, '.claude') : null;
      const base = localDir && existsSync(localDir) ? cwd! : globalHome();
      if (configured) {
        queuePath = isAbsolute(configured) ? configured : join(base, configured);
      } else {
        queuePath = join(base, '.claude', 'later');
      }
    }

    const lines = [
      `Backend: ${cfg.backend}`,
      ...(cfg.options?.dir ? [`Dir: ${cfg.options.dir}`] : []),
      `Source: ${source}`,
      `Queue path: ${queuePath}`,
    ];

    return {
      content: [{ type: 'text', text: `Later configuration:\n\n${lines.join('\n')}` }],
    };
  },
);

server.tool(
  'later_config_set',
  'Update the later-queue persistence configuration. When called with a cwd, writes to the project-level config. Otherwise writes to the global config.',
  {
    backend: z.enum(['json', 'markdown']).describe('Storage backend to use'),
    dir: z.string().optional().describe('Custom directory for markdown backend (relative or absolute)'),
    cwd: z.string().optional().describe('Current working directory — if provided, writes local project config; otherwise writes global config'),
  },
  async ({ backend, dir, cwd }) => {
    const config = {
      backend,
      ...(dir !== undefined && { options: { dir } }),
    };

    let location: string;
    if (cwd) {
      await writeLocalConfig(cwd, config);
      location = join(cwd, '.claude', 'later.config.json');
    } else {
      await writeGlobalConfig(config);
      location = join(globalHome(), '.claude', 'later.config.json');
    }

    const lines = [
      `Backend: ${backend}`,
      ...(dir ? [`Dir: ${dir}`] : []),
      `Written to: ${location}`,
    ];

    return {
      content: [{ type: 'text', text: `Later configuration updated:\n\n${lines.join('\n')}` }],
    };
  },
);

// === Prompts — behavioural guidance for Claude Desktop (mirrors Claude Code skills) ===

server.prompt(
  'later-add',
  'Add a deferred action to the later-queue',
  { action: z.string().optional().describe('The action to defer') },
  ({ action }) => ({
    messages: [{
      role: 'user' as const,
      content: {
        type: 'text' as const,
        text: action
          ? `Add "${action}" to the later-queue using later_push. If there is relevant context from the current conversation (current task, file being edited, topic being discussed), include a short summary as the context parameter. Confirm the action was added with its short ID.`
          : `Ask me what action I want to defer. Then add it to the later-queue using later_push, including a brief context summary from our current conversation. Confirm with the item's short ID.`,
      },
    }],
  })
);

server.prompt(
  'later-list',
  'Show all actions in the later-queue',
  async () => ({
    messages: [{
      role: 'user' as const,
      content: {
        type: 'text' as const,
        text: `List all actions in the later-queue using later_list. Present the results clearly. If the queue is empty, say so. Then briefly remind me of available commands:\n- /later-add — add an action to the queue\n- /later-next — retrieve and process the next action\n- /later-pick — pick a specific action to execute\n- /later-remove — remove one or more actions without executing them\n- /later-clear — empty the entire queue\n- /later-list — show this list`,
      },
    }],
  })
);

server.prompt(
  'later-next',
  'Retrieve and process the next action from the later-queue',
  async () => ({
    messages: [{
      role: 'user' as const,
      content: {
        type: 'text' as const,
        text: `Retrieve the next action from the later-queue using later_pop. If the queue is empty, say so. Otherwise, execute the action immediately without asking for confirmation — treat it as if I had typed it directly.`,
      },
    }],
  })
);

server.prompt(
  'later-pick',
  'Pick a specific action from the later-queue by ID or position and execute it',
  { target: z.string().optional().describe('ID or natural language reference (e.g. "the first one", "3rd item")') },
  ({ target }) => ({
    messages: [{
      role: 'user' as const,
      content: {
        type: 'text' as const,
        text: target
          ? `Pick and execute the later-queue item matching "${target}". First call later_list to get the current items. Resolve the target: if it looks like an ID (hex string), match it directly; if it's a natural language reference (e.g. "first", "3rd", "last"), resolve by position. Then call later_pick with the resolved ID and execute the action immediately without asking for confirmation.`
          : `Show me the later-queue using later_list, then ask which item I want to pick and execute.`,
      },
    }],
  })
);

server.prompt(
  'later-remove',
  'Remove one or more specific actions from the later-queue without executing them',
  { target: z.string().optional().describe('ID, position, or natural language reference to items to remove') },
  ({ target }) => ({
    messages: [{
      role: 'user' as const,
      content: {
        type: 'text' as const,
        text: target
          ? `Remove the later-queue item(s) matching "${target}" without executing them. First call later_list. Resolve the target(s): match by ID, by position (e.g. "first", "items 1 and 3"), or description. Then call later_remove once per item. Confirm which actions were removed.`
          : `Show me the later-queue using later_list, then ask which item(s) I want to remove.`,
      },
    }],
  })
);

server.prompt(
  'later-clear',
  'Clear all actions from the later-queue at once',
  async () => ({
    messages: [{
      role: 'user' as const,
      content: {
        type: 'text' as const,
        text: `First call later_list to show me how many actions are in the queue. Then ask for my confirmation before proceeding. If I confirm, call later_clear to empty the queue and confirm it has been cleared.`,
      },
    }],
  })
);

server.prompt(
  'later-config',
  'Show the current persistence configuration for the later-queue',
  async () => ({
    messages: [{
      role: 'user' as const,
      content: {
        type: 'text' as const,
        text: `Call later_config_get to show the current persistence configuration. Present the results clearly: the backend (json or markdown), the source of the configuration (env var / config file / default), and where the queue files are stored.`,
      },
    }],
  })
);

server.prompt(
  'later-config-set',
  'Change the later-queue persistence backend',
  {
    backend: z.string().optional().describe('The backend to switch to: "json" or "markdown"'),
    dir: z.string().optional().describe('Custom directory for the markdown backend'),
  },
  ({ backend, dir }) => ({
    messages: [{
      role: 'user' as const,
      content: {
        type: 'text' as const,
        text: backend
          ? `Call later_config_set with backend="${backend}"${dir ? ` and dir="${dir}"` : ''} to update the global persistence configuration. Confirm what was written and where.`
          : `Ask me which backend I want to use for the later-queue (json or markdown). If I choose markdown, also ask if I want a custom directory. Then call later_config_set with the chosen values. Confirm what was written.`,
      },
    }],
  })
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
