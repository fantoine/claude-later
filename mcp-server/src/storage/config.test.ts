import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig, writeLocalConfig, writeGlobalConfig } from './config.js';

let tmpDir: string;
let projectDir: string;
let globalHome: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'later-cfg-'));
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

describe('loadConfig', () => {
  it('defaults to json backend with no config', async () => {
    const cfg = await loadConfig(projectDir);
    expect(cfg.backend).toBe('json');
  });

  it('reads LATER_STORAGE env var', async () => {
    process.env.LATER_STORAGE = 'markdown';
    const cfg = await loadConfig(projectDir);
    expect(cfg.backend).toBe('markdown');
  });

  it('env var wins over local config file', async () => {
    process.env.LATER_STORAGE = 'json';
    await writeFile(
      join(projectDir, '.claude', 'later.config.json'),
      JSON.stringify({ backend: 'markdown' }),
    );
    const cfg = await loadConfig(projectDir);
    expect(cfg.backend).toBe('json');
  });

  it('local config wins over global config', async () => {
    await writeFile(
      join(projectDir, '.claude', 'later.config.json'),
      JSON.stringify({ backend: 'markdown' }),
    );
    await writeFile(
      join(globalHome, '.claude', 'later.config.json'),
      JSON.stringify({ backend: 'json' }),
    );
    const cfg = await loadConfig(projectDir);
    expect(cfg.backend).toBe('markdown');
  });

  it('global config used when no local config', async () => {
    await writeFile(
      join(globalHome, '.claude', 'later.config.json'),
      JSON.stringify({ backend: 'markdown' }),
    );
    const cfg = await loadConfig(projectDir);
    expect(cfg.backend).toBe('markdown');
  });

  it('rejects unknown backend values', async () => {
    process.env.LATER_STORAGE = 'bogus';
    await expect(loadConfig(projectDir)).rejects.toThrow(/unknown backend/i);
  });

  it('preserves options block from config file', async () => {
    await writeFile(
      join(projectDir, '.claude', 'later.config.json'),
      JSON.stringify({ backend: 'markdown', options: { dir: 'custom/later' } }),
    );
    const cfg = await loadConfig(projectDir);
    expect(cfg.options?.dir).toBe('custom/later');
  });
});

describe('writeLocalConfig / writeGlobalConfig', () => {
  it('writeLocalConfig creates .claude/later.config.json in the project', async () => {
    await writeLocalConfig(projectDir, { backend: 'markdown' });
    const cfg = await loadConfig(projectDir);
    expect(cfg.backend).toBe('markdown');
  });

  it('writeGlobalConfig creates ~/.claude/later.config.json', async () => {
    await writeGlobalConfig({ backend: 'markdown', options: { dir: 'custom/later' } });
    delete process.env.LATER_STORAGE; // make sure env doesn't override
    const cfg = await loadConfig(join(tmpDir, 'no-local')); // no local config here
    expect(cfg.backend).toBe('markdown');
    expect(cfg.options?.dir).toBe('custom/later');
  });
});
