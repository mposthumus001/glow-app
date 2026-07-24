import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const soundsPage = readFileSync(
  join(here, "..", "..", "app", "(app)", "calm", "sounds", "page.tsx"),
  "utf8",
);
const preparation = readFileSync(
  join(here, "components", "CalmSoundsPreparation.tsx"),
  "utf8",
);
const calmLayout = readFileSync(
  join(here, "..", "..", "app", "(app)", "calm", "layout.tsx"),
  "utf8",
);
const appShell = readFileSync(
  join(here, "..", "..", "components", "shell", "AppShell.tsx"),
  "utf8",
);
const audioOwner = readFileSync(
  join(here, "components", "CalmAudioOwner.tsx"),
  "utf8",
);
const miniPlayer = readFileSync(
  join(here, "components", "CalmMiniPlayer.tsx"),
  "utf8",
);
const previewScreen = readFileSync(
  join(here, "components", "CalmScreen.tsx"),
  "utf8",
);
const playerService = readFileSync(
  join(here, "player", "CalmPlayerService.ts"),
  "utf8",
);

describe("Calm Sounds preview-off contract", () => {
  it("defaults off and resolves the public flag at the server route boundary", () => {
    assert.match(
      soundsPage,
      /process\.env\.NEXT_PUBLIC_CALM_SOUNDS_PREVIEW_ENABLED === "true"/,
    );
    assert.match(soundsPage, /if \(!previewEnabled\)/);
    assert.match(soundsPage, /return <CalmSoundsPreparation \/>/);
  });

  it("keeps preparation standalone, exact, and free of audio dependencies", () => {
    assert.match(
      preparation,
      /Soundscapes are still being prepared for the Glow beta\./,
    );
    for (const forbidden of [
      "useCalmPlayer",
      "CalmPlayerService",
      "CalmPlayerPanel",
      "SoundCard",
      "../catalogue",
      "<audio",
      "Volume",
      "timer",
      "Favourite",
    ]) {
      assert.equal(preparation.includes(forbidden), false, forbidden);
    }
  });

  it("keeps the disabled branch ahead of the only preview import", () => {
    const disabledBranch = soundsPage.indexOf("if (!previewEnabled)");
    const preparationReturn = soundsPage.indexOf(
      "return <CalmSoundsPreparation />",
    );
    const previewImport = soundsPage.indexOf("await import(");

    assert.ok(disabledBranch >= 0);
    assert.ok(preparationReturn > disabledBranch);
    assert.ok(previewImport > preparationReturn);
    assert.match(
      soundsPage.slice(previewImport),
      /@\/features\/calm\/components\/CalmScreen/,
    );
    assert.equal(
      soundsPage.includes(
        'import { CalmScreen } from "@/features/calm/components/CalmScreen"',
      ),
      false,
    );
    assert.doesNotMatch(
      soundsPage.slice(0, previewImport),
      /useCalmPlayer|CalmPlayerService|CalmPlayerPanel|SoundCard|catalogue|getCalmPlayerService/,
    );
  });

  it("keeps shared navigation visible without mounting the audio owner", () => {
    assert.match(calmLayout, /<CalmSegmentNav \/>/);
    assert.match(appShell, /NEXT_PUBLIC_CALM_SOUNDS_PREVIEW_ENABLED === "true"/);
    assert.doesNotMatch(appShell, /from ["']@\/features\/calm["']/);
    assert.match(appShell, /<CalmAudioOwner \/>/);
    assert.match(audioOwner, /useCalmPlayerLifecycle\(\)/);
    assert.equal((audioOwner.match(/useCalmPlayerLifecycle\(\)/g) ?? []).length, 1);
  });

  it("does not autoplay or expose browser side effects on route entry", () => {
    assert.doesNotMatch(soundsPage, /\.play\(|autoplay|autoPlay|vibrate|Notification/);
    assert.doesNotMatch(preparation, /\.play\(|autoplay|autoPlay|vibrate|Notification/);
    assert.match(playerService, /audio\.preload = "none"/);
    assert.equal((playerService.match(/new Audio\(\)/g) ?? []).length, 1);
    assert.match(previewScreen, /selectSound\(soundId, \{ autoplay: true \}\)/);
    assert.match(previewScreen, /onClick=\{\(\) =>/);
  });

  it("keeps full and mini players mutually exclusive", () => {
    assert.match(
      miniPlayer,
      /pathname === "\/calm" \|\| pathname === "\/calm\/sounds"/,
    );
    assert.match(miniPlayer, /if \(!sound\) return null/);
    assert.match(miniPlayer, /snapshot\.status === "idle"/);
    assert.equal((audioOwner.match(/<CalmMiniPlayer \/>/g) ?? []).length, 1);
  });
});
