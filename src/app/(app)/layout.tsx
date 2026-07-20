import { isFamilyAlbumEnabled } from "@/features/family/config";
import { AppShell } from "@/components/shell";
import { loadCircleNavUnreadHint } from "@/features/circles/service/ReadStateRepository";
import { requireAppUser } from "@/lib/auth/require-app-user";

/**
 * Authenticated app layout — owns shell, navigation, and presence lifecycle.
 * Feature realtime (Atlas clusters, Circle messaging) stays page-scoped.
 */
export default async function AuthenticatedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireAppUser();
  const circleNavHint = await loadCircleNavUnreadHint(user.id);
  const familyAlbumEnabled = isFamilyAlbumEnabled();

  return (
    <AppShell circleNavHint={circleNavHint} familyAlbumEnabled={familyAlbumEnabled}>
      {children}
    </AppShell>
  );
}
