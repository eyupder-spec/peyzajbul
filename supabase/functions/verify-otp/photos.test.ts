import { describe, expect, it } from "vitest";
import { reconcilePhotoPaths } from "./photos.ts";

const LEAD = "11111111-1111-4111-8111-111111111111";

describe("reconcilePhotoPaths", () => {
  it("keeps only the photos that reached the bucket", () => {
    const declared = [`${LEAD}/a.jpg`, `${LEAD}/b.png`, `${LEAD}/c.webp`];
    expect(reconcilePhotoPaths(declared, LEAD, ["a.jpg", "c.webp", "unrelated.jpg"])).toEqual([
      `${LEAD}/a.jpg`,
      `${LEAD}/c.webp`,
    ]);
  });

  it("returns nothing when no upload completed", () => {
    expect(reconcilePhotoPaths([`${LEAD}/a.jpg`], LEAD, [])).toEqual([]);
  });

  it("leaves legacy paths outside the lead folder alone", () => {
    const legacy = "5f0c2d3e-0000-4000-8000-000000000000/old.jpg";
    expect(reconcilePhotoPaths([legacy], LEAD, [])).toEqual([legacy]);
  });

  it("handles a lead without photos", () => {
    expect(reconcilePhotoPaths(null, LEAD, ["a.jpg"])).toEqual([]);
    expect(reconcilePhotoPaths(undefined, LEAD, [])).toEqual([]);
  });
});
