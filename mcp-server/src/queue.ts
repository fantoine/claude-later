import { resolveStorage } from './storage/factory.js';
import type { LaterItem } from './storage/types.js';

export type { LaterItem } from './storage/types.js';

async function storage(cwd?: string) {
  return resolveStorage(cwd ?? process.cwd());
}

export async function pushItem(
  action: string,
  context?: string,
  project?: string,
  cwd?: string,
): Promise<LaterItem> {
  const s = await storage(cwd);
  return s.push({
    action,
    ...(context !== undefined && { context }),
    ...(project !== undefined && { project }),
    cwd: cwd ?? process.cwd(),
  });
}

export async function popItem(cwd?: string): Promise<LaterItem | null> {
  return (await storage(cwd)).pop();
}

export async function listItems(project?: string, cwd?: string): Promise<LaterItem[]> {
  return (await storage(cwd)).list(project);
}

export async function pickItem(id: string, cwd?: string): Promise<LaterItem | null> {
  return (await storage(cwd)).pick(id);
}

export async function removeItem(id: string, cwd?: string): Promise<boolean> {
  return (await storage(cwd)).remove(id);
}

export async function clearQueue(cwd?: string): Promise<number> {
  return (await storage(cwd)).clear();
}
