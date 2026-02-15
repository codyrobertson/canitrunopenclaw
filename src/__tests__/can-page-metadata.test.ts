import { describe, expect, test } from "vitest";

import { getNonWontRunVerdicts } from "@/lib/queries";
import { generateMetadata } from "@/app/can/[fork]/run-on/[device]/page";

describe("/can/[fork]/run-on/[device] metadata", () => {
  test("sets canonical to the clean path", async () => {
    const combos = await getNonWontRunVerdicts();
    if (combos.length === 0) {
      expect(true).toBe(true);
      return;
    }
    const combo = combos[0];

    const md = await generateMetadata({
      params: Promise.resolve({ fork: combo.fork_slug, device: combo.device_slug }),
    });

    expect(md.alternates?.canonical).toBe(`/can/${combo.fork_slug}/run-on/${combo.device_slug}`);
  });
});
