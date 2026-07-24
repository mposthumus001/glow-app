import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SleepTimerScheduler } from "./SleepTimerScheduler.ts";

describe("SleepTimerScheduler", () => {
  it("fires once at the wall-clock deadline", () => {
    let now = 1_000;
    let callback: (() => void) | null = null;
    let clears = 0;
    const scheduler = new SleepTimerScheduler({
      now: () => now,
      setTimeout: (next) => {
        callback = next;
        return 1 as unknown as ReturnType<typeof setTimeout>;
      },
      clearTimeout: () => {
        clears += 1;
      },
    });
    let fires = 0;

    scheduler.replace(2_000, () => {
      fires += 1;
    });
    now = 2_000;
    assert.ok(callback);
    (callback as () => void)();
    scheduler.checkNow();

    assert.equal(fires, 1);
    assert.ok(clears >= 0);
  });

  it("replacing a timer cancels the previous timeout", () => {
    let clears = 0;
    const scheduler = new SleepTimerScheduler({
      now: () => 0,
      setTimeout: () => 1 as unknown as ReturnType<typeof setTimeout>,
      clearTimeout: () => {
        clears += 1;
      },
    });

    scheduler.replace(1_000, () => undefined);
    scheduler.replace(2_000, () => undefined);
    assert.equal(clears, 1);
  });

  it("rechecks delayed callbacks against the absolute deadline", () => {
    let now = 100;
    let callback: (() => void) | null = null;
    const scheduler = new SleepTimerScheduler({
      now: () => now,
      setTimeout: (next) => {
        callback = next;
        return 1 as unknown as ReturnType<typeof setTimeout>;
      },
      clearTimeout: () => undefined,
    });
    let fires = 0;

    scheduler.replace(1_000, () => {
      fires += 1;
    });
    now = 500;
    (callback as unknown as () => void)();
    assert.equal(fires, 0);
    now = 1_500;
    (callback as unknown as () => void)();
    assert.equal(fires, 1);
  });
});
