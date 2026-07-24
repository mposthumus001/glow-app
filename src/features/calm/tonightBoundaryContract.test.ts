import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(here, "..", "..");
const tonightRoute = readFileSync(
  join(srcRoot, "app", "(app)", "page.tsx"),
  "utf8",
);
const tonightScreen = readFileSync(
  join(srcRoot, "components", "tonight", "TonightScreen.tsx"),
  "utf8",
);
const tonightIndex = readFileSync(
  join(srcRoot, "components", "tonight", "index.ts"),
  "utf8",
);

describe("Calm and Tonight boundary", () => {
  it("leaves the Tonight route delegated to its established screen", () => {
    assert.match(
      tonightRoute,
      /import \{ TonightScreen \} from "@\/components\/tonight"/,
    );
    assert.match(tonightRoute, /<TonightScreen/);
    assert.match(tonightRoute, /loadAssignedCircleForParent/);
    assert.match(tonightIndex, /TonightScreen/);
  });

  it("does not implement or import Calm Support inside Tonight", () => {
    const tonightSource = `${tonightRoute}\n${tonightScreen}\n${tonightIndex}`;
    for (const forbidden of [
      "@/features/calm",
      "/calm/support",
      "CalmExerciseScreen",
      "one-minute-breathing-reset",
      "five-senses-grounding",
      "tonight-is-hard-reassurance",
    ]) {
      assert.equal(tonightSource.includes(forbidden), false, forbidden);
    }
  });
});
