import type { LaterItem, LaterItemInput, LaterStorage } from './types.js';

export class MarkdownStorage implements LaterStorage {
  constructor(private readonly dir: string) {
    void this.dir;
  }
  async push(_: LaterItemInput): Promise<LaterItem> { throw new Error('not implemented'); }
  async pop(): Promise<LaterItem | null> { throw new Error('not implemented'); }
  async list(_?: string): Promise<LaterItem[]> { throw new Error('not implemented'); }
  async pick(_: string): Promise<LaterItem | null> { throw new Error('not implemented'); }
  async remove(_: string): Promise<boolean> { throw new Error('not implemented'); }
  async clear(): Promise<number> { throw new Error('not implemented'); }
}
