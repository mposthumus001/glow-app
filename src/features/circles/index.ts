export {
  isFormingCircle,
  isSmallCircle,
} from "./types";
export type {
  AssignedCircleView,
  CircleLoadResult,
  CircleLoadStatus,
  CircleMessagePreview,
  CircleSummary,
  MessageAreaStatus,
} from "./types";

export { CircleScreen } from "./components/CircleScreen";
export { CircleLoadingState } from "./components/CircleLoadingState";

export {
  MESSAGE_MAX_LENGTH,
  MESSAGE_PAGE_SIZE,
  prepareMessageBody,
  upsertConfirmedMessage,
  replaceOptimisticWithConfirmed,
} from "./messaging/messageLogic";
export type { CircleFeedMessage } from "./messaging/messageLogic";

export {
  TYPING_PUBLISH_DELAY_MS,
  TYPING_REFRESH_MS,
  TYPING_EXPIRE_MS,
  formatOnlinePresenceCopy,
  formatTypingIndicatorCopy,
} from "./messaging/presenceLogic";
