import { describe, expect, it } from "vitest";
import { isMoving } from "./use-moving";

describe("typing off while moving", () => {
  it("counts more than 3 m/s as moving", () => {
    expect(isMoving(0)).toBe(false);
    expect(isMoving(3)).toBe(false);
    expect(isMoving(3.5)).toBe(true);
    expect(isMoving(22)).toBe(true);
  });
  it("treats an unknown speed as stopped", () => {
    expect(isMoving(null)).toBe(false);
    expect(isMoving(undefined)).toBe(false);
    expect(isMoving(Number.NaN)).toBe(false);
  });
});
