export interface LaterItem {
  id: string;
  action: string;
  context?: string;
  project?: string;
  cwd: string;
  createdAt: string;
}

export type LaterItemInput = Omit<LaterItem, 'id' | 'createdAt'>;

export interface LaterStorage {
  push(input: LaterItemInput): Promise<LaterItem>;
  pop(): Promise<LaterItem | null>;
  list(project?: string): Promise<LaterItem[]>;
  pick(idOrPrefix: string): Promise<LaterItem | null>;
  remove(idOrPrefix: string): Promise<boolean>;
  clear(): Promise<number>;
}

export type StorageBackend = 'json' | 'markdown';

export interface StorageConfig {
  backend: StorageBackend;
  options?: {
    dir?: string;
  };
}
