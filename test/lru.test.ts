import { describe, expect, test } from "bun:test";
import { WeightedLru, type EvictionReason } from "../src/util/lru";

describe("WeightedLru", () => {
  test("evicts least-recently-used entries until within budget", () => {
    const cache = new WeightedLru<string, string>({ maxWeight: 5, weightOf: (value) => value.length });
    cache.set("a", "aa");
    cache.set("b", "bb");
    cache.get("a"); // promote a, so b is oldest
    cache.set("c", "cc");

    expect(cache.has("a")).toBe(true);
    expect(cache.has("b")).toBe(false);
    expect(cache.has("c")).toBe(true);
    expect(cache.currentWeight).toBe(4);
  });

  test("replacement updates weight and reports the replaced value", () => {
    const evicted: Array<[string, string, EvictionReason]> = [];
    const cache = new WeightedLru<string, string>({
      maxWeight: 10,
      weightOf: (value) => value.length,
      onEvict: (value, key, reason) => evicted.push([key, value, reason]),
    });
    cache.set("a", "aa");
    cache.set("a", "aaaa");

    expect(cache.currentWeight).toBe(4);
    expect(cache.get("a")).toBe("aaaa");
    expect(evicted).toEqual([["a", "aa", "replace"]]);
  });

  test("does not retain a value larger than the total budget", () => {
    const cache = new WeightedLru<string, string>({ maxWeight: 3, weightOf: (value) => value.length });
    expect(cache.set("huge", "1234")).toBe(false);
    expect(cache.has("huge")).toBe(false);
    expect(cache.currentWeight).toBe(0);
  });

  test("delete and clear update weight and invoke callbacks", () => {
    const reasons: EvictionReason[] = [];
    const cache = new WeightedLru<string, string>({
      maxWeight: 10,
      weightOf: (value) => value.length,
      onEvict: (_value, _key, reason) => reasons.push(reason),
    });
    cache.set("a", "a");
    cache.set("b", "bb");
    expect(cache.delete("a")).toBe(true);
    cache.clear();

    expect(cache.size).toBe(0);
    expect(cache.currentWeight).toBe(0);
    expect(reasons).toEqual(["delete", "clear"]);
  });

  test("rejects invalid weights", () => {
    expect(() => new WeightedLru({ maxWeight: 0, weightOf: () => 1 })).toThrow();
    const cache = new WeightedLru<string, string>({ maxWeight: 10, weightOf: () => Number.NaN });
    expect(() => cache.set("a", "a")).toThrow();
  });
});
