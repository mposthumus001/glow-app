export {
  TONIGHT_PROMPT_PLACEHOLDER,
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
