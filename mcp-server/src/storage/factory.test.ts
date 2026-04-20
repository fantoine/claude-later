import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { resolveStorage } from './factory.js';
import { JsonStorage } from './json.js';

let tmpDir: string;
let projectDir: string;
let globalHome: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'later-factory-'));
  projectDir = join(tmpDir, 'project');
  globalHome = join(tmpDir, 'home');
  await mkdir(join(projectDir, '.claude'), { recursive: true });
  await mkdir(join(globalHome, '.claude'), { recursive: true });
  process.env.LATER_HOME_OVERRIDE = globalHome;
  delete process.env.LATER_STORAGE;
});

afterEach(async () => {
  delete process.env.LATER_HOME_OVERRIDE;
  delete process.env.LATER_STORAGE;
  await rm(tmpDir, { recursive: true, force: true });
});

describe('resolveStorage', () => {
  it('returns JsonStorage pointing to local .claude when cwd has one', async () => {
    const s = await resolveStorage(projectDir);
    expect(s).toBeInstanceOf(JsonStorage);
    const item = await s.push({ action: 'test', cwd: projectDir });
    const list = await s.list();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(item.id);
  });

  it('isolates local and global queues', async () => {
    const noLocalDir = join(tmpDir, 'no-local');
    await mkdir(noLocalDir, { recursive: true });
    const local = await resolveStorage(projectDir);
    const global = await resolveStorage(noLocalDir);
    await local.push({ action: 'local', cwd: projectDir });
    await global.push({ action: 'global', cwd: noLocalDir });
    expect(await local.list()).toHaveLength(1);
    expect(await global.list()).toHaveLength(1);
    expect((await local.list())[0].action).toBe('local');
    expect((await global.list())[0].action).toBe('global');
  });
});
