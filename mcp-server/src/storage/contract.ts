import { describe, it, expect, beforeEach } from 'vitest';
import type { LaterStorage } from './types.js';

export function runStorageContract(
  name: string,
  makeStorage: () => Promise<LaterStorage> | LaterStorage,
): void {
  describe(`${name} — storage contract`, () => {
    let storage: LaterStorage;

    beforeEach(async () => {
      storage = await makeStorage();
    });

    it('push returns an item with id and createdAt', async () => {
      const item = await storage.push({ action: 'test', cwd: '/tmp' });
      expect(item.action).toBe('test');
      expect(item.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(item.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('push preserves optional fields', async () => {
      const item = await storage.push({
        action: 'a',
        context: 'ctx',
        project: 'p',
        cwd: '/tmp',
      });
      expect(item.context).toBe('ctx');
      expect(item.project).toBe('p');
    });

    it('list returns empty by default', async () => {
      expect(await storage.list()).toEqual([]);
    });

    it('list returns items in insertion (FIFO) order', async () => {
      await storage.push({ action: 'first', cwd: '/tmp' });
      await storage.push({ action: 'second', cwd: '/tmp' });
      const items = await storage.list();
      expect(items.map((i) => i.action)).toEqual(['first', 'second']);
    });

    it('list filters by project', async () => {
      await storage.push({ action: 'a', project: 'p1', cwd: '/tmp' });
      await storage.push({ action: 'b', project: 'p2', cwd: '/tmp' });
      const filtered = await storage.list('p1');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].action).toBe('a');
    });

    it('pop returns null on empty', async () => {
      expect(await storage.pop()).toBeNull();
    });

    it('pop returns and removes oldest (FIFO)', async () => {
      await storage.push({ action: 'first', cwd: '/tmp' });
      await storage.push({ action: 'second', cwd: '/tmp' });
      const popped = await storage.pop();
      expect(popped?.action).toBe('first');
      expect(await storage.list()).toHaveLength(1);
    });

    it('pick resolves by full id', async () => {
      const a = await storage.push({ action: 'a', cwd: '/tmp' });
      const picked = await storage.pick(a.id);
      expect(picked?.id).toBe(a.id);
      expect(await storage.list()).toHaveLength(0);
    });

    it('pick resolves by short prefix (8 chars)', async () => {
      const a = await storage.push({ action: 'a', cwd: '/tmp' });
      const picked = await storage.pick(a.id.slice(0, 8));
      expect(picked?.id).toBe(a.id);
    });

    it('pick returns null for unknown id', async () => {
      expect(await storage.pick('nonexistent')).toBeNull();
    });

    it('remove returns true on hit, false on miss', async () => {
      const a = await storage.push({ action: 'a', cwd: '/tmp' });
      expect(await storage.remove(a.id)).toBe(true);
      expect(await storage.remove(a.id)).toBe(false);
    });

    it('remove by short prefix works', async () => {
      const a = await storage.push({ action: 'a', cwd: '/tmp' });
      expect(await storage.remove(a.id.slice(0, 8))).toBe(true);
    });

    it('remove does not affect siblings', async () => {
      await storage.push({ action: 'keep', cwd: '/tmp' });
      const b = await storage.push({ action: 'drop', cwd: '/tmp' });
      await storage.remove(b.id);
      const remaining = await storage.list();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].action).toBe('keep');
    });

    it('clear empties the queue and returns count', async () => {
      await storage.push({ action: 'a', cwd: '/tmp' });
      await storage.push({ action: 'b', cwd: '/tmp' });
      expect(await storage.clear()).toBe(2);
      expect(await storage.list()).toEqual([]);
    });

    it('clear on empty returns 0', async () => {
      expect(await storage.clear()).toBe(0);
    });
  });
}
