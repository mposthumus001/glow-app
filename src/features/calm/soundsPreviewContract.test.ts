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
const playerPanel = readFileSync(
  join(here, "components", "CalmPlayerPanel.tsx"),
  "utf8",
);
const soundCard = readFileSync(
  join(here, "components", "SoundCard.tsx"),
  "utf8",
);
const soundsFlags = readFileSync(
  join(here, "sounds", "flags.ts"),
  "utf8",
);
const supportPage = readFileSync(
  join(here, "..", "..", "app", "(app)", "calm", "support", "page.tsx"),
  "utf8",
);

describe("Calm Sounds preview-off contract", () => {
  it("defaults off and resolves both public flags at the route boundary", () => {
    assert.match(
      soundsFlags,
      /process\.env\.NEXT_PUBLIC_CALM_SOUNDS_PREVIEW_ENABLED === "true"/,
    );
    assert.match(
      soundsFlags,
      /process\.env\.NEXT_PUBLIC_CALM_SOUNDS_ENABLED === "true"/,
    );
    assert.match(soundsPage, /if \(mode === "off"\)/);
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
    const disabledBranch = soundsPage.indexOf('if (mode === "off")');
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
    assert.match(appShell, /NEXT_PUBLIC_CALM_SOUNDS_ENABLED === "true"/);
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
    assert.match(previewScreen, /selectAndPlay\(soundId\)/);
    assert.match(previewScreen, /Nothing plays automatically\./);
  });

  it("keeps full and mini players mutually exclusive", () => {
    assert.match(
      audioOwner,
      /pathname === "\/calm" \|\| pathname === "\/calm\/sounds"/,
    );
    assert.match(miniPlayer, /if \(!sound\) return null/);
    assert.doesNotMatch(miniPlayer, /snapshot\.status === "idle".*return null/);
    assert.equal((audioOwner.match(/<CalmMiniPlayer \/>/g) ?? []).length, 1);
  });

  it("keeps Support free of catalogue and player imports", () => {
    assert.doesNotMatch(
      supportPage,
      /catalogue|CalmPlayer|useCalmPlayer|features\/calm\/sounds/,
    );
  });

  it("feature-detects Media Session and avoids prohibited browser APIs", () => {
    assert.match(playerService, /"mediaSession" in navigator/);
    assert.match(playerService, /setActionHandler\("play"/);
    assert.match(playerService, /setActionHandler\("pause"/);
    assert.match(playerService, /setActionHandler\("stop"/);
    assert.match(playerService, /artist: "Glow Sounds"/);
    assert.doesNotMatch(
      playerService,
      /album:|child|baby|family|categoryLabel|setPositionState|nexttrack|previoustrack/i,
    );
    assert.doesNotMatch(
      `${playerService}\n${previewScreen}`,
      /navigator\.vibrate|Notification|showSaveFilePicker|download\s*=|listeningDuration|listening_duration/,
    );
  });

  it("shows calm loading/errors with keyboard and screen-reader semantics", () => {
    assert.match(playerPanel, /Preparing sound…/);
    assert.match(playerPanel, /role="alert"/);
    assert.match(playerPanel, /aria-live="polite"/);
    assert.match(playerPanel, /aria-valuetext/);
    assert.match(playerPanel, /type="range"/);
    assert.match(soundCard, /type="button"/);
    assert.match(soundCard, /aria-label=\{label\}/);
    assert.match(soundCard, /disabled=\{loading\}/);
    assert.match(miniPlayer, /Playback unavailable/);
    assert.match(miniPlayer, /Retry sound/);
  });

  it("keeps the Sounds layout mobile-first without horizontal scrolling", () => {
    assert.match(previewScreen, /grid min-w-0 gap-3 sm:grid-cols-2/);
    assert.match(soundCard, /min-w-0 flex-1/);
    assert.match(miniPlayer, /min-w-0 flex-1/);
    assert.doesNotMatch(
      `${previewScreen}\n${soundCard}\n${playerPanel}`,
      /overflow-x-auto|w-screen|min-w-\[[4-9][0-9]{2}px\]/,
    );
  });

  it("contains no listening duration or volume monitoring", () => {
    const operationalCalls =
      playerService.match(/reportOperationalFailure\([\s\S]*?\);/g) ?? [];
    assert.equal(operationalCalls.length, 0);
    assert.doesNotMatch(
      playerService,
      /listening[_A-Z]?duration|localTime|emotional|supportCategory|babyData|familyData/i,
    );
  });
});
