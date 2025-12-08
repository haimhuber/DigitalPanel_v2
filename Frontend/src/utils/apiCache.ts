interface CacheItem {
  data: any;
  timestamp: number;
  expiry: number;
}

class ApiCache {
  private cache = new Map<string, CacheItem>();
  private defaultTTL = 30000; // 30 seconds

  set(key: string, data: any, ttl = this.defaultTTL) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  clear() {
    this.cache.clear();
  }
}

export const apiCache = new ApiCache();