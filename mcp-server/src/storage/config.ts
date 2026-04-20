import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { StorageBackend, StorageConfig } from './types.js';

const KNOWN_BACKENDS: readonly StorageBackend[] = ['json', 'markdown'];

function assertBackend(value: string): StorageBackend {
  if (!(KNOWN_BACKENDS as readonly string[]).includes(value)) {
    throw new Error(`Unknown backend "${value}". Expected one of: ${KNOWN_BACKENDS.join(', ')}`);
  }
  return value as StorageBackend;
}

async function readConfigFile(path: string): Promise<Partial<StorageConfig> | null> {
  if (!existsSync(path)) return null;
  const raw = await readFile(path, 'utf8');
  const parsed = JSON.parse(raw) as Partial<StorageConfig>;
  return parsed;
}

export function globalHome(): string {
  return process.env.LATER_HOME_OVERRIDE ?? homedir();
}

export async function writeLocalConfig(cwd: string, config: StorageConfig): Promise<void> {
  const dir = join(cwd, '.claude');
  await mkdir(dir, { recursive: true });
  const data: Record<string, unknown> = { backend: config.backend };
  if (config.options !== undefined) {
    data.options = config.options;
  }
  await writeFile(join(dir, 'later.config.json'), JSON.stringify(data, null, 2), 'utf8');
}

export async function writeGlobalConfig(config: StorageConfig): Promise<void> {
  const dir = join(globalHome(), '.claude');
  await mkdir(dir, { recursive: true });
  const data: Record<string, unknown> = { backend: config.backend };
  if (config.options !== undefined) {
    data.options = config.options;
  }
  await writeFile(join(dir, 'later.config.json'), JSON.stringify(data, null, 2), 'utf8');
}

export async function loadConfig(cwd: string): Promise<StorageConfig> {
  const localPath = join(cwd, '.claude', 'later.config.json');
  const globalPath = join(globalHome(), '.claude', 'later.config.json');

  const local = await readConfigFile(localPath);
  const global = await readConfigFile(globalPath);
  const fileCfg = local ?? global ?? {};

  const envBackend = process.env.LATER_STORAGE;
  const backendRaw = envBackend ?? fileCfg.backend ?? 'json';
  const backend = assertBackend(backendRaw);

  return {
    backend,
    options: fileCfg.options,
  };
}
