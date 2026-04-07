#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { pushItem, popItem, listItems, pickItem, removeItem } from './queue.js';

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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
