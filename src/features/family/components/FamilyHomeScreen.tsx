import Link from "next/link";

import { GlowButton } from "@/components/ui";
import { PageHeader } from "@/components/shell/PageHeader";

import type { SharedFamilyListItem } from "../types";
import { FamilyCard } from "./FamilyCard";
import { FamilyEmptyState } from "./FamilyEmptyState";
import { FamilyPageShell } from "./FamilyPageShell";

export type FamilyHomeScreenProps = {
  families: SharedFamilyListItem[];
};

export function FamilyHomeScreen({ families }: FamilyHomeScreenProps) {
  const hasFamilies = families.length > 0;

  return (
    <FamilyPageShell>
      <PageHeader
          title="Family"
          subtitle="A private shared space for the people you invite — only Moments you choose to share appear here."
          action={
            hasFamilies ? (
              <Link href="/family/new" className="block w-full sm:w-auto">
                <GlowButton variant="primary" fullWidth>
                  Create a family
                </GlowButton>
              </Link>
            ) : undefined
          }
        />

        {hasFamilies ? (
          <ul className="flex list-none flex-col gap-3 p-0">
            {families.map((family) => (
              <li key={family.id} className="min-w-0">
                <FamilyCard family={family} />
              </li>
            ))}
          </ul>
        ) : (
          <FamilyEmptyState />
        )}
    </FamilyPageShell>
  );
}
