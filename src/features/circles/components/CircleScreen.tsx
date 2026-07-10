"use client";

import { motion } from "framer-motion";
import Link from "next/link";

import { BottomNavigation, GlowContainer, GlowPage } from "@/components/layout";
import type { CircleLoadResult, MessageAreaStatus } from "@/features/circles/types";
import { useGlowReducedMotion } from "@/lib/hooks/useGlowReducedMotion";
import { cn } from "@/lib/utils/cn";

import { CircleComposer } from "./CircleComposer";
import { CircleErrorState } from "./CircleErrorState";
import { CircleHeader } from "./CircleHeader";
import { CircleMessageArea } from "./CircleMessageArea";
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
}

function messageAreaStatus(result: CircleLoadResult): MessageAreaStatus {
  if (result.status === "error") return "error";
  if (result.status !== "assigned") return "empty";
  return result.data.messages.length === 0 ? "empty" : "ready";
}

export function CircleScreen({ result }: CircleScreenProps) {
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
              <CircleUnassignedState />
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
            <>
              <motion.div
                custom={1}
                initial={reduceMotion ? false : "hidden"}
                animate={reduceMotion ? undefined : "visible"}
                variants={reduceMotion ? undefined : fadeUp}
              >
                <CircleHeader data={result.data} />
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
                <CircleMessageArea
                  status={messageAreaStatus(result)}
                  messages={result.data.messages}
                />
              </motion.div>

              <motion.div
                custom={4}
                initial={reduceMotion ? false : "hidden"}
                animate={reduceMotion ? undefined : "visible"}
                variants={reduceMotion ? undefined : fadeUp}
              >
                <CircleComposer />
              </motion.div>
            </>
          ) : null}
        </GlowContainer>
      </main>

      <BottomNavigation activeId="circle" />
    </GlowPage>
  );
}
