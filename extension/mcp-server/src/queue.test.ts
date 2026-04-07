import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pushItem, popItem, listItems, pickItem, removeItem } from './queue.js';

let tmpDir: string;
let projectDir: string;
let globalDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'later-test-'));
  projectDir = join(tmpDir, 'project');
  globalDir = join(tmpDir, 'global');
  await mkdir(join(projectDir, '.claude'), { recursive: true });
  await mkdir(join(globalDir, '.claude'), { recursive: true });
  process.env.LATER_HOME_OVERRIDE = globalDir;
});

afterEach(async () => {
  delete process.env.LATER_HOME_OVERRIDE;
  await rm(tmpDir, { recursive: true, force: true });
});

describe('resolveStoragePath', () => {
  it('uses local queue file when .claude/ exists in cwd', async () => {
    const item = await pushItem('test action', undefined, undefined, projectDir);
    const items = await listItems(undefined, projectDir);
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(item.id);
  });

  it('uses global queue when cwd has no .claude/', async () => {
    const noDotClaudeDir = join(tmpDir, 'no-claude');
    await mkdir(noDotClaudeDir, { recursive: true });
    const item = await pushItem('global action', undefined, undefined, noDotClaudeDir);
    const items = await listItems(undefined, noDotClaudeDir);
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(item.id);
  });

  it('local and global queues are independent', async () => {
    const noDotClaudeDir = join(tmpDir, 'no-claude');
    await mkdir(noDotClaudeDir, { recursive: true });
    await pushItem('local action', undefined, undefined, projectDir);
    await pushItem('global action', undefined, undefined, noDotClaudeDir);
    expect(await listItems(undefined, projectDir)).toHaveLength(1);
    expect(await listItems(undefined, noDotClaudeDir)).toHaveLength(1);
    expect((await listItems(undefined, projectDir))[0].action).toBe('local action');
    expect((await listItems(undefined, noDotClaudeDir))[0].action).toBe('global action');
  });
});

describe('pushItem', () => {
  it('adds an item to the queue', async () => {
    const item = await pushItem('fix the bug', undefined, undefined, projectDir);
    expect(item.action).toBe('fix the bug');
    expect(item.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(item.cwd).toBe(projectDir);
  });

  it('stores optional context and project', async () => {
    const item = await pushItem('refactor auth', 'noticed while reviewing PR', 'my-app', projectDir);
    expect(item.context).toBe('noticed while reviewing PR');
    expect(item.project).toBe('my-app');
  });

  it('appends to existing queue', async () => {
    await pushItem('first', undefined, undefined, projectDir);
    await pushItem('second', undefined, undefined, projectDir);
    const items = await listItems(undefined, projectDir);
    expect(items).toHaveLength(2);
    expect(items[0].action).toBe('first');
    expect(items[1].action).toBe('second');
  });
});

describe('popItem', () => {
  it('returns null on empty queue', async () => {
    expect(await popItem(projectDir)).toBeNull();
  });

  it('returns and removes the first item (FIFO)', async () => {
    await pushItem('first', undefined, undefined, projectDir);
    await pushItem('second', undefined, undefined, projectDir);
    const item = await popItem(projectDir);
    expect(item?.action).toBe('first');
    expect(await listItems(undefined, projectDir)).toHaveLength(1);
  });
});

describe('listItems', () => {
  it('returns empty array when queue is empty', async () => {
    expect(await listItems(undefined, projectDir)).toEqual([]);
  });

  it('filters by project', async () => {
    await pushItem('task A', undefined, 'proj-1', projectDir);
    await pushItem('task B', undefined, 'proj-2', projectDir);
    const filtered = await listItems('proj-1', projectDir);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].action).toBe('task A');
  });
});

describe('pickItem', () => {
  it('returns null for unknown id', async () => {
    expect(await pickItem('nonexistent', projectDir)).toBeNull();
  });

  it('retrieves and removes by full id', async () => {
    const item = await pushItem('target', undefined, undefined, projectDir);
    const picked = await pickItem(item.id, projectDir);
    expect(picked?.id).toBe(item.id);
    expect(await listItems(undefined, projectDir)).toHaveLength(0);
  });

  it('retrieves by short id (first 8 chars)', async () => {
    const item = await pushItem('target', undefined, undefined, projectDir);
    const picked = await pickItem(item.id.slice(0, 8), projectDir);
    expect(picked?.id).toBe(item.id);
  });
});

describe('removeItem', () => {
  it('returns false for unknown id', async () => {
    expect(await removeItem('nonexistent', projectDir)).toBe(false);
  });

  it('removes item and returns true', async () => {
    const item = await pushItem('to remove', undefined, undefined, projectDir);
    expect(await removeItem(item.id, projectDir)).toBe(true);
    expect(await listItems(undefined, projectDir)).toHaveLength(0);
  });
});
