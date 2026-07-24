import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CALM_SERVER_SNAPSHOT,
  CalmSnapshotCache,
  createInitialSnapshot,
  hydrateSnapshotFromPrefs,
  snapshotsEqual,
} from "./playerLogic.ts";

describe("CalmSnapshotCache stability", () => {
  it("repeated getSnapshot calls return the same reference when unchanged", () => {
    const cache = new CalmSnapshotCache();
    const a = cache.getSnapshot();
    const b = cache.getSnapshot();
    const c = cache.getSnapshot();
    assert.equal(a, b);
    assert.equal(b, c);
  });

  it("snapshot reference changes after a real state update", () => {
    const cache = new CalmSnapshotCache();
    const before = cache.getSnapshot();
    const changed = cache.patch({ favouriteSoundIds: ["soft-rain"] });
    assert.equal(changed, true);
    const after = cache.getSnapshot();
    assert.notEqual(before, after);
    assert.deepEqual(after.favouriteSoundIds, ["soft-rain"]);
    assert.equal(cache.getSnapshot(), after);
  });

  it("noop updates keep the same snapshot reference and do not notify", () => {
    const cache = new CalmSnapshotCache();
    cache.patch({ favouriteSoundIds: ["gentle-waves"] });
    const snap = cache.getSnapshot();
    let notifications = 0;
    cache.subscribe(() => {
      notifications += 1;
    });
    // subscribe notifies once immediately
    assert.equal(notifications, 1);

    const changed = cache.patch({ favouriteSoundIds: ["gentle-waves"] });
    assert.equal(changed, false);
    assert.equal(cache.getSnapshot(), snap);
    assert.equal(notifications, 1);
  });

  it("subscribe cleanup stops further notifications", () => {
    const cache = new CalmSnapshotCache();
    let calls = 0;
    const unsubscribe = cache.subscribe(() => {
      calls += 1;
    });
    assert.equal(calls, 1);

    cache.patch({ volume: 0.2 });
    assert.equal(calls, 2);

    unsubscribe();
    cache.patch({ volume: 0.5 });
    assert.equal(calls, 2);
  });

  it("replaceSilent hydrates without notifying listeners", () => {
    const cache = new CalmSnapshotCache();
    let calls = 0;
    cache.subscribe(() => {
      calls += 1;
    });
    assert.equal(calls, 1);

    const hydrated = hydrateSnapshotFromPrefs(cache.getSnapshot(), {
      volume: 0.33,
      favouriteSoundIds: ["soft-rain"],
      recentSoundId: "soft-rain",
      selectedSoundId: "soft-rain",
    });
    const replaced = cache.replaceSilent(hydrated);
    assert.equal(replaced, true);
    assert.equal(calls, 1);
    assert.equal(cache.getSnapshot().volume, 0.33);

    // Repeated hydration with same values keeps the same reference.
    const again = hydrateSnapshotFromPrefs(cache.getSnapshot(), {
      volume: 0.33,
      favouriteSoundIds: ["soft-rain"],
      recentSoundId: "soft-rain",
      selectedSoundId: "soft-rain",
    });
    assert.equal(again, cache.getSnapshot());
    assert.equal(cache.replaceSilent(again), false);
    assert.equal(calls, 1);
  });
});

describe("getServerSnapshot stability", () => {
  it("repeated reads return the same module-level reference", () => {
    assert.equal(CALM_SERVER_SNAPSHOT, CALM_SERVER_SNAPSHOT);
    assert.equal(CALM_SERVER_SNAPSHOT.status, "idle");
    assert.equal(
      snapshotsEqual(CALM_SERVER_SNAPSHOT, createInitialSnapshot()),
      true,
    );
  });
});
