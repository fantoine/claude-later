import { existsSync } from 'node:fs';
import { join, isAbsolute } from 'node:path';
import { homedir } from 'node:os';
import { JsonStorage } from './json.js';
import { loadConfig } from './config.js';
import type { LaterStorage, StorageConfig } from './types.js';

function globalHome(): string {
  return process.env.LATER_HOME_OVERRIDE ?? homedir();
}

function resolveJsonPath(cwd: string): string {
  const localDir = join(cwd, '.claude');
  if (existsSync(localDir)) return join(localDir, 'later-queue.local.json');
  return join(globalHome(), '.claude', 'later-queue.json');
}

function resolveMarkdownDir(cwd: string, cfg: StorageConfig): string {
  const configured = cfg.options?.dir;
  const localDir = join(cwd, '.claude');
  const base = existsSync(localDir) ? cwd : globalHome();
  if (configured) {
    return isAbsolute(configured) ? configured : join(base, configured);
  }
  return join(base, '.claude', 'later');
}

export async function resolveStorage(cwd: string): Promise<LaterStorage> {
  const cfg = await loadConfig(cwd);
  switch (cfg.backend) {
    case 'json':
      return new JsonStorage(resolveJsonPath(cwd));
    case 'markdown': {
      const { MarkdownStorage } = await import('./markdown.js');
      return new MarkdownStorage(resolveMarkdownDir(cwd, cfg));
    }
  }
}
