import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { LaterItem, LaterItemInput, LaterStorage } from './types.js';

interface LaterQueueFile {
  items: LaterItem[];
}

export class JsonStorage implements LaterStorage {
  constructor(private readonly path: string) {}

  private async read(): Promise<LaterQueueFile> {
    if (!existsSync(this.path)) return { items: [] };
    const raw = await readFile(this.path, 'utf8');
    return JSON.parse(raw) as LaterQueueFile;
  }

  private async write(queue: LaterQueueFile): Promise<void> {
    const dir = dirname(this.path);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    await writeFile(this.path, JSON.stringify(queue, null, 2), 'utf8');
  }

  async push(input: LaterItemInput): Promise<LaterItem> {
    const queue = await this.read();
    const item: LaterItem = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...input,
    };
    queue.items.push(item);
    await this.write(queue);
    return item;
  }

  async pop(): Promise<LaterItem | null> {
    const queue = await this.read();
    if (queue.items.length === 0) return null;
    const [item, ...rest] = queue.items;
    queue.items = rest;
    await this.write(queue);
    return item;
  }

  async list(project?: string): Promise<LaterItem[]> {
    const queue = await this.read();
    if (project === undefined) return queue.items;
    return queue.items.filter((i) => i.project === project);
  }

  async pick(idOrPrefix: string): Promise<LaterItem | null> {
    const queue = await this.read();
    const item = queue.items.find((i) => i.id === idOrPrefix || i.id.startsWith(idOrPrefix));
    if (!item) return null;
    queue.items = queue.items.filter((i) => i.id !== item.id);
    await this.write(queue);
    return item;
  }

  async remove(idOrPrefix: string): Promise<boolean> {
    const queue = await this.read();
    const item = queue.items.find((i) => i.id === idOrPrefix || i.id.startsWith(idOrPrefix));
    if (!item) return false;
    queue.items = queue.items.filter((i) => i.id !== item.id);
    await this.write(queue);
    return true;
  }

  async clear(): Promise<number> {
    const queue = await this.read();
    const count = queue.items.length;
    queue.items = [];
    await this.write(queue);
    return count;
  }
}
