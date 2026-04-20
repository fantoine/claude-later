import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pushItem, listItems, clearQueue } from './queue.js';

let tmpDir: string;
let projectDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'later-e2e-'));
  projectDir = join(tmpDir, 'project');
  await mkdir(join(projectDir, '.claude'), { recursive: true });
  process.env.LATER_HOME_OVERRIDE = tmpDir;
});

afterEach(async () => {
  delete process.env.LATER_HOME_OVERRIDE;
  delete process.env.LATER_STORAGE;
  await rm(tmpDir, { recursive: true, force: true });
});

describe('queue.ts routed through factory', () => {
  it('LATER_STORAGE=json writes a JSON file', async () => {
    process.env.LATER_STORAGE = 'json';
    await pushItem('a', undefined, undefined, projectDir);
    const files = await readdir(join(projectDir, '.claude'));
    expect(files).toContain('later-queue.local.json');
  });

  it('LATER_STORAGE=markdown writes a .md file', async () => {
    process.env.LATER_STORAGE = 'markdown';
    await pushItem('a', 'ctx', 'p', projectDir);
    const laterDir = join(projectDir, '.claude', 'later');
    const files = await readdir(laterDir);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/\.md$/);

    const items = await listItems(undefined, projectDir);
    expect(items).toHaveLength(1);
    expect(items[0].action).toBe('a');
    expect(items[0].context).toBe('ctx');
    expect(items[0].project).toBe('p');

    await clearQueue(projectDir);
    expect(await listItems(undefined, projectDir)).toHaveLength(0);
  });
});
