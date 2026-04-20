import { describe, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { JsonStorage } from './json.js';
import { runStorageContract } from './contract.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'later-json-'));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

runStorageContract('JsonStorage', () => new JsonStorage(join(tmpDir, 'queue.json')));
