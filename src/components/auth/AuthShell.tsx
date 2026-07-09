import Link from "next/link";

import { GlowPage, GlowContainer } from "@/components/layout";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <GlowPage>
      <main className="flex min-h-dvh flex-col justify-center pt-safe pb-safe">
        <GlowContainer size="sm" as="div" className="py-10">
          <div className="mb-8 text-center">
            <Link
              href="/"
              className="glow-gradient-text text-3xl font-bold tracking-tight"
            >
              Glow
            </Link>
            <h1 className="mt-6 text-2xl font-semibold text-glow-text">
              {title}
            </h1>
            <p className="mt-2 text-sm text-glow-text-secondary">{subtitle}</p>
          </div>
          <div className="rounded-glow-card border border-glow-card-border bg-glow-card p-6 shadow-glow-card">
            {children}
          </div>
          {footer ? (
            <div className="mt-6 text-center text-sm text-glow-text-secondary">
              {footer}
            </div>
          ) : null}
        </GlowContainer>
      </main>
    </GlowPage>
  );
}
