import { cpus, totalmem } from "node:os";
import { expect, it } from "vitest";
import { calculateSettlement } from "../src/lib/calculations";
import { maximumHousehold } from "./fixtures";

it("settles 100 maximum-amount, year-long bills for 20 people within the reference target", () => {
  const data = maximumHousehold();
  const timings = Array.from({ length: 7 }, () => {
    const start = performance.now();
    const result = calculateSettlement(data.households[0].id, data);
    const duration = performance.now() - start;
    expect(result.people.reduce((sum, p) => sum + p.net, 0)).toBe(0);
    expect(result.total).toBe(100_000_000_000);
    return duration;
  }).sort((a, b) => a - b);
  console.info(
    JSON.stringify({
      benchmark: "maximum household settlement",
      medianMs: timings[3],
      minMs: timings[0],
      maxMs: timings[6],
      node: process.version,
      cpu: cpus()[0]?.model,
      ramGiB: Math.round(totalmem() / 1024 ** 3),
      platform: process.platform,
    }),
  );
  expect(timings[3]).toBeLessThan(200);
});
