"use client";

import { useState } from "react";

import { getCalmPlayerService } from "@/features/calm";
import { getSoundById } from "@/features/calm/catalogue";
import {
  readPersistedPrefs,
  writePersistedPrefs,
} from "@/features/calm/player/persistence";
import { GlowButton, GlowCard } from "@/components/ui";

/**
 * Device-local Calm preferences — volume, favourite, recent.
 * Does not start playback or persist active audio across refresh.
 */
export function CalmPreferencesPanel() {
  const [prefs, setPrefs] = useState(() => {
    if (typeof window === "undefined") {
      return { volume: 0.7, favouriteSoundId: null as string | null, recentSoundId: null as string | null };
    }
    return (
      readPersistedPrefs(window.localStorage) ?? {
        volume: 0.7,
        favouriteSoundId: null,
        recentSoundId: null,
        selectedSoundId: null,
      }
    );
  });
  const [status, setStatus] = useState<string | null>(null);

  const favourite = getSoundById(prefs.favouriteSoundId);
  const recent = getSoundById(prefs.recentSoundId);

  const applyVolume = (volume: number) => {
    const service = getCalmPlayerService();
    service.setVolume(volume);
    const next = {
      ...prefs,
      volume,
      favouriteSoundId: prefs.favouriteSoundId,
      recentSoundId: prefs.recentSoundId,
      selectedSoundId: null as null,
    };
    writePersistedPrefs(window.localStorage, {
      volume: next.volume,
      favouriteSoundId: next.favouriteSoundId as never,
      recentSoundId: next.recentSoundId as never,
      selectedSoundId: null,
    });
    setPrefs(next);
    setStatus("Default volume saved on this device.");
  };

  const clearPrefs = () => {
    const cleared = {
      volume: 0.7,
      favouriteSoundId: null,
      recentSoundId: null,
      selectedSoundId: null,
    };
    writePersistedPrefs(window.localStorage, cleared);
    const service = getCalmPlayerService();
    service.setVolume(0.7);
    service.setFavourite(null);
    setPrefs(cleared);
    setStatus("Calm preferences cleared on this device.");
  };

  return (
    <div className="space-y-5">
      <GlowCard padding="md" className="border-white/[0.08]">
        <label htmlFor="calm-pref-volume" className="text-sm font-medium text-glow-text-secondary">
          Default volume
        </label>
        <input
          id="calm-pref-volume"
          type="range"
          min={0}
          max={100}
          value={Math.round(prefs.volume * 100)}
          onChange={(e) => applyVolume(Number(e.target.value) / 100)}
          className="mt-3 w-full accent-glow-primary"
          aria-valuetext={`${Math.round(prefs.volume * 100)} percent`}
        />
        <p className="mt-2 text-sm text-glow-text-tertiary">
          {Math.round(prefs.volume * 100)}% — stored on this device only.
        </p>
      </GlowCard>

      <GlowCard padding="md" className="border-white/[0.08]">
        <h2 className="text-sm font-medium text-glow-text-secondary">
          Favourite sound
        </h2>
        <p className="mt-2 text-base text-glow-text">
          {favourite?.title ?? "None saved yet"}
        </p>
        <p className="mt-1 text-sm text-glow-text-tertiary">
          Change this from Calm while a sound is selected.
        </p>
      </GlowCard>

      <GlowCard padding="md" className="border-white/[0.08]">
        <h2 className="text-sm font-medium text-glow-text-secondary">
          Recently played
        </h2>
        <p className="mt-2 text-base text-glow-text">
          {recent?.title ?? "Nothing recent"}
        </p>
      </GlowCard>

      <p className="text-sm text-glow-text-tertiary">
        Sleep timers are session-only and stop when they end or when you sign
        out. Calm never autoplays.
      </p>

      {status ? (
        <p className="text-sm text-glow-success" role="status">
          {status}
        </p>
      ) : null}

      <GlowButton type="button" variant="ghost" onClick={clearPrefs}>
        Clear Calm preferences on this device
      </GlowButton>
    </div>
  );
}
