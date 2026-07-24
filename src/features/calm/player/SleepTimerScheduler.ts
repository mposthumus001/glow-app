export type SleepTimerSchedulerDependencies = {
  now?: () => number;
  setTimeout?: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
  clearTimeout?: (timer: ReturnType<typeof setTimeout>) => void;
};

/**
 * One wall-clock deadline and one timeout. A delayed browser wake-up checks the
 * absolute deadline again, so correctness does not depend on interval ticks.
 */
export class SleepTimerScheduler {
  private readonly now: () => number;
  private readonly scheduleTimeout: NonNullable<
    SleepTimerSchedulerDependencies["setTimeout"]
  >;
  private readonly cancelTimeout: NonNullable<
    SleepTimerSchedulerDependencies["clearTimeout"]
  >;
  private timeout: ReturnType<typeof setTimeout> | null = null;
  private endsAt: number | null = null;
  private onElapsed: (() => void) | null = null;

  constructor(dependencies: SleepTimerSchedulerDependencies = {}) {
    this.now = dependencies.now ?? Date.now;
    this.scheduleTimeout = dependencies.setTimeout ?? setTimeout;
    this.cancelTimeout = dependencies.clearTimeout ?? clearTimeout;
  }

  replace(endsAt: number, onElapsed: () => void): void {
    this.cancel();
    this.endsAt = endsAt;
    this.onElapsed = onElapsed;
    this.scheduleNextCheck();
  }

  checkNow(): void {
    if (this.endsAt == null || !this.onElapsed) return;
    if (this.now() < this.endsAt) {
      this.scheduleNextCheck();
      return;
    }

    const callback = this.onElapsed;
    this.cancel();
    callback();
  }

  cancel(): void {
    if (this.timeout != null) {
      this.cancelTimeout(this.timeout);
    }
    this.timeout = null;
    this.endsAt = null;
    this.onElapsed = null;
  }

  private scheduleNextCheck(): void {
    if (this.endsAt == null) return;
    if (this.timeout != null) {
      this.cancelTimeout(this.timeout);
    }
    const delay = Math.max(0, this.endsAt - this.now());
    this.timeout = this.scheduleTimeout(() => {
      this.timeout = null;
      this.checkNow();
    }, delay);
  }
}
