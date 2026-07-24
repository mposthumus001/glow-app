import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const calmRouteRoot = join(here, "..", "..", "app", "(app)", "calm");
const calmPage = readFileSync(join(calmRouteRoot, "page.tsx"), "utf8");
const segmentNav = readFileSync(
  join(here, "components", "CalmSegmentNav.tsx"),
  "utf8",
);

describe("Calm route contracts", () => {
  it("redirects the root to Support without forwarding a query", () => {
    assert.match(calmPage, /redirect\("\/calm\/support"\)/);
    assert.doesNotMatch(calmPage, /searchParams|useRouter|useEffect/);
  });

  it("provides explicit, structurally indicated segment links", () => {
    assert.match(segmentNav, /href: "\/calm\/support", label: "Support"/);
    assert.match(segmentNav, /href: "\/calm\/sounds", label: "Sounds"/);
    assert.match(segmentNav, /aria-current=\{active \? "page" : undefined\}/);
    assert.match(segmentNav, /font-semibold/);
    assert.match(segmentNav, /after:h-0\.5/);
  });
});
