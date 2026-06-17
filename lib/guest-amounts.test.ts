import { describe, expect, it } from "vitest";
import { parseCashInput, toGuestAmountPatch } from "./guest-amounts";

describe("parseCashInput", () => {
  it("keeps an empty input editable", () => {
    expect(parseCashInput("")).toBeNull();
  });

  it("accepts numeric values and the zero shortcut", () => {
    expect(parseCashInput("12.50")).toBe(12.5);
    expect(parseCashInput("zero")).toBe(0);
    expect(parseCashInput("ZERO")).toBe(0);
  });

  it("returns null for invalid values", () => {
    expect(parseCashInput("not-a-number")).toBeNull();
  });
});

describe("toGuestAmountPatch", () => {
  it("updates only the edited guest amount", () => {
    expect(toGuestAmountPatch({ cash_in: 25 })).toEqual({ cash_in: 25 });
    expect(toGuestAmountPatch({ cash_out: 40 })).toEqual({ cash_out: 40 });
  });

  it("persists a cleared guest amount as zero", () => {
    expect(toGuestAmountPatch({ cash_in: null })).toEqual({ cash_in: 0 });
    expect(toGuestAmountPatch({ cash_out: null })).toEqual({ cash_out: 0 });
  });
});
