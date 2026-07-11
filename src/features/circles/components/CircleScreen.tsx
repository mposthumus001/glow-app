"use client";

import { motion } from "framer-motion";
import { useRef, useState } from "react";

import { GlowContainer } from "@/components/layout";
import { PageHeader } from "@/components/shell/PageHeader";
import type {
  AssignedCircleView,
  CircleLoadResult,
} from "@/features/circles/types";
import { useCircleMessages } from "@/features/circles/messaging/useCircleMessages";
import type { CircleDailyPrompt } from "@/features/circles/prompts/promptLibrary";
import { useGlowReducedMotion } from "@/lib/hooks/useGlowReducedMotion";

import { CircleComposer } from "./CircleComposer";
import { CircleErrorState } from "./CircleErrorState";
import { CircleHeader } from "./CircleHeader";
import { CircleMessageFeed } from "./CircleMessageFeed";
import { CirclePromptCard } from "./CirclePromptCard";
import { CircleTypingIndicator } from "./CircleTypingIndicator";
import { CircleUnassignedState } from "./CircleUnassignedState";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.07,
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

export interface CircleScreenProps {
  result: CircleLoadResult;
  parentId: string;
  displayName: string;
  /** @deprecated Nav hint is owned by AppShell */
  circleNavHint?: string | null;
  dailyPrompt?: CircleDailyPrompt | null;
  promptUnavailable?: boolean;
}

export function CircleScreen({
  result,
  parentId,
  displayName,
  dailyPrompt = null,
  promptUnavailable = false,
}: CircleScreenProps) {
  const reduceMotion = useGlowReducedMotion();

  return (
    <div className="flex min-h-[calc(100dvh-var(--glow-bottom-nav-height))] flex-col overflow-y-auto pt-safe lg:min-h-dvh">
      <GlowContainer
        size="md"
        as="div"
        className="flex flex-1 flex-col pb-4 pt-6"
      >
        <motion.div
          custom={0}
          initial={reduceMotion ? false : "hidden"}
          animate={reduceMotion ? undefined : "visible"}
          variants={reduceMotion ? undefined : fadeUp}
        >
          <PageHeader
            title="Your Circle"
            subtitle="A small private group — supportive, never noisy."
          />
        </motion.div>

        {result.status === "unassigned" ? (
          <motion.div
            custom={1}
            initial={reduceMotion ? false : "hidden"}
            animate={reduceMotion ? undefined : "visible"}
            variants={reduceMotion ? undefined : fadeUp}
            className="flex flex-1 flex-col"
          >
            <CircleUnassignedState message={result.message} />
          </motion.div>
        ) : null}

        {result.status === "error" ? (
          <motion.div
            custom={1}
            initial={reduceMotion ? false : "hidden"}
            animate={reduceMotion ? undefined : "visible"}
            variants={reduceMotion ? undefined : fadeUp}
            className="flex flex-1 flex-col"
          >
            <CircleErrorState message={result.message} />
          </motion.div>
        ) : null}

        {result.status === "assigned" ? (
          <AssignedCircleSession
            data={result.data}
            parentId={parentId}
            displayName={displayName}
            reduceMotion={reduceMotion}
            dailyPrompt={dailyPrompt}
            promptUnavailable={promptUnavailable}
          />
        ) : null}
      </GlowContainer>
    </div>
  );
}

function AssignedCircleSession({
  data,
  parentId,
  displayName,
  reduceMotion,
  dailyPrompt,
  promptUnavailable,
}: {
  data: AssignedCircleView;
  parentId: string;
  displayName: string;
  reduceMotion: boolean;
  dailyPrompt: CircleDailyPrompt | null;
  promptUnavailable: boolean;
}) {
  const messaging = useCircleMessages({
    circleId: data.circle.id,
    parentId,
    authorName: displayName,
  });

  const composerRef = useRef<HTMLTextAreaElement>(null);
  const [focusComposerToken, setFocusComposerToken] = useState(0);

  const promptStatus =
    promptUnavailable || !dailyPrompt?.promptText ? "unavailable" : "ready";

  const handleSharePrompt = () => {
    if (dailyPrompt?.id && dailyPrompt.id !== "fallback") {
      messaging.setSendPromptId(dailyPrompt.id);
    }
    setFocusComposerToken((value) => value + 1);
  };

  return (
    <>
      <motion.div
        custom={1}
        initial={reduceMotion ? false : "hidden"}
        animate={reduceMotion ? undefined : "visible"}
        variants={reduceMotion ? undefined : fadeUp}
      >
        <CircleHeader
          data={data}
          onlineCount={messaging.onlineCount}
          onlinePreviewNames={messaging.onlinePreviewNames}
          connection={messaging.connection}
          unreadHint={
            messaging.unreadCount > 0
              ? messaging.unreadCount === 1
                ? "1 new message"
                : `${messaging.unreadCount} new messages`
              : null
          }
          showSafetyNote
        />
      </motion.div>

      <motion.div
        custom={2}
        initial={reduceMotion ? false : "hidden"}
        animate={reduceMotion ? undefined : "visible"}
        variants={reduceMotion ? undefined : fadeUp}
      >
        <CirclePromptCard
          prompt={dailyPrompt}
          status={promptStatus}
          onShare={promptStatus === "ready" ? handleSharePrompt : undefined}
        />
      </motion.div>

      <motion.div
        custom={3}
        initial={reduceMotion ? false : "hidden"}
        animate={reduceMotion ? undefined : "visible"}
        variants={reduceMotion ? undefined : fadeUp}
        className="flex flex-1 flex-col"
      >
        <CircleMessageFeed
          messages={messaging.messages}
          status={messaging.status}
          errorMessage={messaging.error}
          hasEarlier={messaging.hasEarlier}
          loadingEarlier={messaging.loadingEarlier}
          onLoadEarlier={() => {
            void messaging.loadEarlier();
          }}
          onRetry={(clientKey) => {
            void messaging.retry(clientKey);
          }}
          sendingClientKey={messaging.sendingClientKey}
          viewerParentId={parentId}
          circleId={data.circle.id}
          reactionsByMessage={messaging.reactionsByMessage}
          firstUnreadIndex={messaging.firstUnreadIndex}
          onToggleReaction={messaging.toggleReaction}
          onReadObservation={messaging.updateReadObservation}
          onHideMessage={messaging.hideMessage}
          onReportMessage={messaging.reportMessage}
        />
      </motion.div>

      <motion.div
        custom={4}
        initial={reduceMotion ? false : "hidden"}
        animate={reduceMotion ? undefined : "visible"}
        variants={reduceMotion ? undefined : fadeUp}
        className="space-y-2 pb-safe"
      >
        <CircleTypingIndicator label={messaging.typingLabel} />
        <CircleComposer
          onSend={async (body) => {
            const result = await messaging.send(body);
            if (result.ok) {
              messaging.setSendPromptId(null);
            }
            return result;
          }}
          onTypingActivity={messaging.notifyTypingActivity}
          onStopTyping={() => {
            void messaging.stopTyping();
          }}
          isSending={messaging.sendingClientKey != null}
          textareaRef={composerRef}
          focusRequestToken={focusComposerToken}
        />
      </motion.div>
    </>
  );
}
