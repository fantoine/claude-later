import { existsSync } from 'node:fs';
import { readFile, writeFile, readdir, mkdir, unlink, rename } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import matter from 'gray-matter';
import type { LaterItem, LaterItemInput, LaterStorage } from './types.js';

// Monotonic counter: ensures filename ordering preserves insertion order within the same ms.
let lastTs = 0;
let counter = 0;

interface FileRecord {
  filename: string;
  item: LaterItem;
}

function filenameFor(item: LaterItem, seq: number): string {
  const ts = item.createdAt.replace(/[:.]/g, '-');
  const seqStr = String(seq).padStart(3, '0');
  return `${ts}-${seqStr}-${item.id.slice(0, 8)}.md`;
}

function serialize(item: LaterItem): string {
  const frontmatter: Record<string, string> = {
    id: item.id,
    cwd: item.cwd,
    createdAt: item.createdAt,
  };
  if (item.project !== undefined) frontmatter.project = item.project;

  let body = item.action.trim();
  if (item.context !== undefined && item.context.trim().length > 0) {
    body += `\n\n## Context\n${item.context.trim()}`;
  }
  return matter.stringify(body + '\n', frontmatter);
}

function parseBody(body: string): { action: string; context?: string } {
  const lines = body.split('\n');
  const contextIdx = lines.findIndex((l) => l.trim() === '## Context');

  const actionLines = contextIdx === -1 ? lines : lines.slice(0, contextIdx);
  const action = actionLines.join('\n').trim();

  if (contextIdx === -1) return { action };

  const contextLines = lines.slice(contextIdx + 1);
  const nextHeadingIdx = contextLines.findIndex((l) => /^##\s/.test(l));
  const contextSlice =
    nextHeadingIdx === -1 ? contextLines : contextLines.slice(0, nextHeadingIdx);
  const context = contextSlice.join('\n').trim();
  return context.length > 0 ? { action, context } : { action };
}

export class MarkdownStorage implements LaterStorage {
  constructor(private readonly dir: string) {}

  private async ensureDir(): Promise<void> {
    if (!existsSync(this.dir)) await mkdir(this.dir, { recursive: true });
  }

  private async readAll(): Promise<FileRecord[]> {
    if (!existsSync(this.dir)) return [];
    const files = (await readdir(this.dir)).filter((f) => f.endsWith('.md'));
    const records = await Promise.all(
      files.map(async (filename) => {
        const raw = await readFile(join(this.dir, filename), 'utf8');
        const { data, content } = matter(raw);
        const { action, context } = parseBody(content);
        const item: LaterItem = {
          id: String(data.id),
          action,
          ...(context !== undefined && { context }),
          ...(data.project !== undefined && { project: String(data.project) }),
          cwd: String(data.cwd),
          createdAt: String(data.createdAt),
        };
        return { filename, item };
      }),
    );
    records.sort((a, b) => a.filename.localeCompare(b.filename));
    return records;
  }

  private async atomicWrite(path: string, content: string): Promise<void> {
    const dir = dirname(path);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    const tmp = `${path}.${randomUUID()}.tmp`;
    await writeFile(tmp, content, 'utf8');
    await rename(tmp, path);
  }

  async push(input: LaterItemInput): Promise<LaterItem> {
    await this.ensureDir();
    const now = Date.now();
    if (now > lastTs) {
      lastTs = now;
      counter = 0;
    } else {
      counter++;
    }
    const item: LaterItem = {
      id: randomUUID(),
      createdAt: new Date(now).toISOString(),
      ...input,
    };
    await this.atomicWrite(join(this.dir, filenameFor(item, counter)), serialize(item));
    return item;
  }

  async pop(): Promise<LaterItem | null> {
    const records = await this.readAll();
    if (records.length === 0) return null;
    const [first] = records;
    await unlink(join(this.dir, first.filename));
    return first.item;
  }

  async list(project?: string): Promise<LaterItem[]> {
    const records = await this.readAll();
    const items = records.map((r) => r.item);
    if (project === undefined) return items;
    return items.filter((i) => i.project === project);
  }

  async pick(idOrPrefix: string): Promise<LaterItem | null> {
    const records = await this.readAll();
    const hit = records.find(
      (r) => r.item.id === idOrPrefix || r.item.id.startsWith(idOrPrefix),
    );
    if (!hit) return null;
    await unlink(join(this.dir, hit.filename));
    return hit.item;
  }

  async remove(idOrPrefix: string): Promise<boolean> {
    const picked = await this.pick(idOrPrefix);
    return picked !== null;
  }

  async clear(): Promise<number> {
    const records = await this.readAll();
    await Promise.all(records.map((r) => unlink(join(this.dir, r.filename))));
    return records.length;
  }
}
