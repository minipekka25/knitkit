export interface CachedModule {
  source: string;
  format: "module";
  integrity?: string;
}

/**
 * In-memory cache for fetched remote modules, keyed by resolved URL.
 *
 * Node's loader hooks run in a worker thread with documented ~4x/~400ms overhead for a
 * no-op; caching the fetched + SRI-verified source keeps repeated SSR renders cheap.
 * (Disk caching is a documented future option; memory is enough to offset hook overhead
 * within a process.)
 */
export class ModuleCache {
  private store = new Map<string, CachedModule>();

  get(url: string): CachedModule | undefined {
    return this.store.get(url);
  }

  set(url: string, mod: CachedModule): void {
    this.store.set(url, mod);
  }

  has(url: string): boolean {
    return this.store.has(url);
  }

  delete(url: string): boolean {
    return this.store.delete(url);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}
