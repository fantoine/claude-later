import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';

export interface LaterItem {
  id: string;
  action: string;
  context?: string;
  project?: string;
  cwd: string;
  createdAt: string;
}

export interface LaterQueue {
  items: LaterItem[];
}

function resolveStoragePath(cwd?: string): string {
  const dir = cwd ?? process.cwd();
  const localDir = join(dir, '.claude');
  if (existsSync(localDir)) {
    return join(localDir, 'later-queue.local.json');
  }
  const globalHome = process.env.LATER_HOME_OVERRIDE ?? homedir();
  return join(globalHome, '.claude', 'later-queue.json');
}

async function readQueue(storagePath: string): Promise<LaterQueue> {
  if (!existsSync(storagePath)) {
    return { items: [] };
  }
  const raw = await readFile(storagePath, 'utf8');
  return JSON.parse(raw) as LaterQueue;
}

async function writeQueue(storagePath: string, queue: LaterQueue): Promise<void> {
  const dir = join(storagePath, '..');
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(storagePath, JSON.stringify(queue, null, 2), 'utf8');
}

export async function pushItem(action: string, context?: string, project?: string, cwd?: string): Promise<LaterItem> {
  const storagePath = resolveStoragePath(cwd);
  const queue = await readQueue(storagePath);

  const item: LaterItem = {
    id: randomUUID(),
    action,
    ...(context !== undefined && { context }),
    ...(project !== undefined && { project }),
    cwd: cwd ?? process.cwd(),
    createdAt: new Date().toISOString(),
  };

  queue.items.push(item);
  await writeQueue(storagePath, queue);
  return item;
}

export async function popItem(cwd?: string): Promise<LaterItem | null> {
  const storagePath = resolveStoragePath(cwd);
  const queue = await readQueue(storagePath);

  if (queue.items.length === 0) {
    return null;
  }

  const [item, ...rest] = queue.items;
  queue.items = rest;
  await writeQueue(storagePath, queue);
  return item;
}

export async function listItems(project?: string, cwd?: string): Promise<LaterItem[]> {
  const storagePath = resolveStoragePath(cwd);
  const queue = await readQueue(storagePath);

  if (project !== undefined) {
    return queue.items.filter((item) => item.project === project);
  }
  return queue.items;
}

export async function pickItem(id: string, cwd?: string): Promise<LaterItem | null> {
  const storagePath = resolveStoragePath(cwd);
  const queue = await readQueue(storagePath);

  const item = queue.items.find((i) => i.id === id || i.id.startsWith(id));
  if (!item) return null;

  queue.items = queue.items.filter((i) => i.id !== item.id);
  await writeQueue(storagePath, queue);
  return item;
}

export async function removeItem(id: string, cwd?: string): Promise<boolean> {
  const storagePath = resolveStoragePath(cwd);
  const queue = await readQueue(storagePath);

  const before = queue.items.length;
  queue.items = queue.items.filter((item) => item.id !== id);

  if (queue.items.length === before) {
    return false;
  }

  await writeQueue(storagePath, queue);
  return true;
}
