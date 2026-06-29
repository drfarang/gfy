export type EvictionReason = "capacity" | "replace" | "delete" | "clear";

export interface WeightedLruOptions<K, V> {
  maxWeight: number;
  weightOf: (value: V, key: K) => number;
  onEvict?: (value: V, key: K, reason: EvictionReason) => void;
}

interface Entry<V> {
  value: V;
  weight: number;
}

/** Small insertion-ordered LRU whose capacity is measured by caller-defined weight. */
export class WeightedLru<K, V> {
  readonly maxWeight: number;
  private readonly weightOf: (value: V, key: K) => number;
  private readonly onEvict?: (value: V, key: K, reason: EvictionReason) => void;
  private readonly entries = new Map<K, Entry<V>>();
  private weight = 0;

  constructor(options: WeightedLruOptions<K, V>) {
    if (!Number.isFinite(options.maxWeight) || options.maxWeight <= 0) {
      throw new RangeError("maxWeight must be a positive finite number");
    }
    this.maxWeight = options.maxWeight;
    this.weightOf = options.weightOf;
    this.onEvict = options.onEvict;
  }

  get size(): number {
    return this.entries.size;
  }

  get currentWeight(): number {
    return this.weight;
  }

  has(key: K): boolean {
    return this.entries.has(key);
  }

  get(key: K): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  /** Returns false when the value itself is larger than the entire budget. */
  set(key: K, value: V): boolean {
    const nextWeight = this.weightOf(value, key);
    if (!Number.isFinite(nextWeight) || nextWeight < 0) {
      throw new RangeError("entry weight must be a non-negative finite number");
    }

    const previous = this.entries.get(key);
    if (previous) this.remove(key, previous, "replace");
    if (nextWeight > this.maxWeight) return false;

    this.entries.set(key, { value, weight: nextWeight });
    this.weight += nextWeight;
    while (this.weight > this.maxWeight) {
      const oldest = this.entries.entries().next().value as [K, Entry<V>] | undefined;
      if (!oldest) break;
      this.remove(oldest[0], oldest[1], "capacity");
    }
    return true;
  }

  delete(key: K): boolean {
    const entry = this.entries.get(key);
    if (!entry) return false;
    this.remove(key, entry, "delete");
    return true;
  }

  clear(): void {
    for (const [key, entry] of this.entries) {
      this.remove(key, entry, "clear");
    }
  }

  private remove(key: K, entry: Entry<V>, reason: EvictionReason): void {
    this.entries.delete(key);
    this.weight -= entry.weight;
    this.onEvict?.(entry.value, key, reason);
  }
}
