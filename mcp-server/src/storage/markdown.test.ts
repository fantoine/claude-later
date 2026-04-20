import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { MarkdownStorage } from './markdown.js';
import { runStorageContract } from './contract.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'later-md-'));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

runStorageContract('MarkdownStorage', () => new MarkdownStorage(join(tmpDir, 'later')));

describe('MarkdownStorage file layout', () => {
  it('writes one .md file per item with frontmatter + body', async () => {
    const dir = join(tmpDir, 'layout');
    const storage = new MarkdownStorage(dir);
    const item = await storage.push({
      action: 'Fix the auth bug',
      context: 'noticed during PR review',
      project: 'my-app',
      cwd: '/path/to/proj',
    });

    const files = await readdir(dir);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(new RegExp(`^.+-${item.id.slice(0, 8)}\\.md$`));

    const raw = await readFile(join(dir, files[0]), 'utf8');
    expect(raw).toContain(`id: ${item.id}`);
    expect(raw).toContain('project: my-app');
    expect(raw).toContain('Fix the auth bug');
    expect(raw).toContain('## Context');
    expect(raw).toContain('noticed during PR review');
  });

  it('omits the Context section when no context is supplied', async () => {
    const dir = join(tmpDir, 'no-context');
    const storage = new MarkdownStorage(dir);
    await storage.push({ action: 'plain action', cwd: '/tmp' });
    const files = await readdir(dir);
    const raw = await readFile(join(dir, files[0]), 'utf8');
    expect(raw).not.toContain('## Context');
    expect(raw.trim().endsWith('plain action')).toBe(true);
  });

  it('preserves insertion order for pushes within the same millisecond', async () => {
    const dir = join(tmpDir, 'same-ms');
    const storage = new MarkdownStorage(dir);

    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-04-20T12:00:00.000Z'));
      await storage.push({ action: 'first', cwd: '/tmp' });
      await storage.push({ action: 'second', cwd: '/tmp' });
      await storage.push({ action: 'third', cwd: '/tmp' });
    } finally {
      vi.useRealTimers();
    }

    const list = await storage.list();
    expect(list.map((i) => i.action)).toEqual(['first', 'second', 'third']);

    const files = (await readdir(dir)).sort();
    expect(files).toHaveLength(3);
    expect(files[0]).toContain('-000-');
    expect(files[1]).toContain('-001-');
    expect(files[2]).toContain('-002-');
  });

  it('parses back an externally-edited file with extra body sections', async () => {
    const dir = join(tmpDir, 'edited');
    const storage = new MarkdownStorage(dir);
    const item = await storage.push({
      action: 'original action',
      context: 'original context',
      cwd: '/tmp',
    });
    const files = await readdir(dir);
    const path = join(dir, files[0]);
    const original = await readFile(path, 'utf8');
    const edited = original + '\n\n## Notes\nadded by hand\n';
    const { writeFile } = await import('node:fs/promises');
    await writeFile(path, edited, 'utf8');

    const list = await storage.list();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(item.id);
    expect(list[0].action).toBe('original action');
    expect(list[0].context).toBe('original context');
  });
});
