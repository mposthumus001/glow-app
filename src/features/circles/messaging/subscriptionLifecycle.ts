/**
 * Tiny helpers for messaging subscription lifecycle assertions in tests.
 */
export function shouldAcceptRealtimeMessage(input: {
  activeCircleId: string;
  incomingCircleId: string;
  existingIds: ReadonlySet<string>;
  incomingId: string;
}): boolean {
  if (input.incomingCircleId !== input.activeCircleId) return false;
  if (input.existingIds.has(input.incomingId)) return false;
  return true;
}

export function createSubscriptionSession() {
  let active = false;
  let circleId: string | null = null;

  return {
    start(nextCircleId: string) {
      active = true;
      circleId = nextCircleId;
    },
    stop() {
      active = false;
      circleId = null;
    },
    isActive() {
      return active;
    },
    getCircleId() {
      return circleId;
    },
  };
}
