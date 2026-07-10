"use client";

import { motion } from "framer-motion";
import Link from "next/link";

import { BottomNavigation, GlowContainer, GlowPage } from "@/components/layout";
import type {
  AssignedCircleView,
  CircleLoadResult,
} from "@/features/circles/types";
import { useCircleMessages } from "@/features/circles/messaging/useCircleMessages";
import { useGlowReducedMotion } from "@/lib/hooks/useGlowReducedMotion";
import { cn } from "@/lib/utils/cn";

import { CircleComposer } from "./CircleComposer";
import { CircleErrorState } from "./CircleErrorState";
import { CircleHeader } from "./CircleHeader";
import { CircleMessageFeed } from "./CircleMessageFeed";
import { CircleTypingIndicator } from "./CircleTypingIndicator";
import { CircleUnassignedState } from "./CircleUnassignedState";
import { TonightPromptCard } from "./TonightPromptCard";

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
  circleNavHint?: string | null;
}

export function CircleScreen({
  result,
  parentId,
  displayName,
  circleNavHint = null,
}: CircleScreenProps) {
  const reduceMotion = useGlowReducedMotion();

  return (
    <GlowPage withBottomNav>
      <main className="flex min-h-dvh flex-col overflow-y-auto pt-safe">
        <GlowContainer
          size="md"
          as="div"
          className="flex flex-1 flex-col pb-4"
        >
          <motion.div
            custom={0}
            initial={reduceMotion ? false : "hidden"}
            animate={reduceMotion ? undefined : "visible"}
            variants={reduceMotion ? undefined : fadeUp}
            className="flex items-center justify-between gap-3 pb-6 pt-8"
          >
            <Link
              href="/"
              className={cn(
                "glow-gradient-text text-[1.75rem] font-bold tracking-tight",
                "rounded-lg focus-visible:outline-none focus-visible:ring-2",
                "focus-visible:ring-glow-primary/50 focus-visible:ring-offset-2",
                "focus-visible:ring-offset-glow-background",
              )}
            >
              Glow
            </Link>
            <p className="text-sm text-glow-text-tertiary">Your Circle</p>
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
            />
          ) : null}
        </GlowContainer>
      </main>

      <BottomNavigation activeId="circle" circleUnreadHint={circleNavHint} />
    </GlowPage>
  );
}

function AssignedCircleSession({
  data,
  parentId,
  displayName,
  reduceMotion,
}: {
  data: AssignedCircleView;
  parentId: string;
  displayName: string;
  reduceMotion: boolean;
}) {
  const messaging = useCircleMessages({
    circleId: data.circle.id,
    parentId,
    authorName: displayName,
  });

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
        />
      </motion.div>

      <motion.div
        custom={2}
        initial={reduceMotion ? false : "hidden"}
        animate={reduceMotion ? undefined : "visible"}
        variants={reduceMotion ? undefined : fadeUp}
      >
        <TonightPromptCard />
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
          reactionsByMessage={messaging.reactionsByMessage}
          firstUnreadIndex={messaging.firstUnreadIndex}
          onToggleReaction={messaging.toggleReaction}
          onReadObservation={messaging.updateReadObservation}
        />
      </motion.div>

      <motion.div
        custom={4}
        initial={reduceMotion ? false : "hidden"}
        animate={reduceMotion ? undefined : "visible"}
        variants={reduceMotion ? undefined : fadeUp}
        className="space-y-2"
      >
        <CircleTypingIndicator label={messaging.typingLabel} />
        <CircleComposer
          onSend={messaging.send}
          onTypingActivity={messaging.notifyTypingActivity}
          onStopTyping={() => {
            void messaging.stopTyping();
          }}
          isSending={messaging.sendingClientKey != null}
        />
      </motion.div>
    </>
  );
}
