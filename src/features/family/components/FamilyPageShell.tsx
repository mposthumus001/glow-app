import { GlowContainer } from "@/components/layout";

import { FAMILY_PAGE_COLUMN_CLASS } from "./familyPageLayout";

export type FamilyPageShellProps = {
  children: React.ReactNode;
};

export function FamilyPageShell({ children }: FamilyPageShellProps) {
  return (
    <div className="overflow-x-hidden overflow-y-auto pt-safe">
      <GlowContainer size="full" as="div" className={FAMILY_PAGE_COLUMN_CLASS}>
        {children}
      </GlowContainer>
    </div>
  );
}
