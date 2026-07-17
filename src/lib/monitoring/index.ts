export {
  GLOW_FEATURE_AREAS,
  isGlowFeatureArea,
  type GlowFeatureArea,
} from "@/lib/monitoring/feature-areas";
export {
  captureSupabaseError,
  reportOperationalFailure,
  reportUnexpectedException,
  type OperationalFailureContext,
  type UnexpectedExceptionContext,
} from "@/lib/monitoring/report-error";
export {
  getClientSentryDsn,
  getDeploymentEnvironment,
  getSentryRelease,
  isClientSentryEnabled,
  isSentryEnabled,
} from "@/lib/monitoring/sentry-options";
export {
  captureControlledVerificationError,
  SENTRY_VERIFICATION_ERROR_MESSAGE,
  type ControlledCaptureDiagnostics,
} from "@/lib/monitoring/sentry-client";
export {
  isSensitiveFieldName,
  scrubSentryEvent,
  scrubString,
} from "@/lib/monitoring/sentry-privacy";
