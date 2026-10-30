import { describe, it, expect } from "vitest";
import {
  JOB_TRANSITIONS,
  canTransition,
  availableTransitions,
} from "../src/modules/jobs/job.transitions.js";

describe("job state machine", () => {
  it("happy path advances one step at a time", () => {
    const happyPath = [
      "REQUESTED",
      "SCHEDULED",
      "ASSIGNED",
      "EN_ROUTE",
      "IN_PROGRESS",
      "COMPLETED",
      "INVOICED",
      "PAID",
    ];
    for (let i = 0; i < happyPath.length - 1; i++) {
      expect(canTransition(happyPath[i], happyPath[i + 1])).toBe(true);
    }
  });

  it("rejects skipping steps", () => {
    expect(canTransition("REQUESTED", "PAID")).toBe(false);
    expect(canTransition("REQUESTED", "COMPLETED")).toBe(false);
    expect(canTransition("EN_ROUTE", "PAID")).toBe(false);
    expect(canTransition("IN_PROGRESS", "INVOICED")).toBe(false);
  });

  it("allows cancelling only before work starts", () => {
    for (const status of ["REQUESTED", "SCHEDULED", "ASSIGNED"]) {
      expect(canTransition(status, "CANCELLED"), `${status} -> CANCELLED`).toBe(true);
    }
    for (const status of ["EN_ROUTE", "IN_PROGRESS", "COMPLETED", "INVOICED", "PAID"]) {
      expect(canTransition(status, "CANCELLED"), `${status} -> CANCELLED`).toBe(false);
    }
  });

  it("terminal statuses have no exits", () => {
    expect(availableTransitions("PAID")).toEqual([]);
    expect(availableTransitions("CANCELLED")).toEqual([]);
  });

  it("every non-terminal status has at least one exit (no dead ends)", () => {
    for (const [status, nexts] of Object.entries(JOB_TRANSITIONS)) {
      if (!["PAID", "CANCELLED"].includes(status)) {
        expect(nexts.length, `${status} is a dead end`).toBeGreaterThan(0);
      }
    }
  });

  it("unknown statuses can never transition", () => {
    expect(canTransition("UNKNOWN", "REQUESTED")).toBe(false);
    expect(canTransition("REQUESTED", "UNKNOWN")).toBe(false);
  });

  it("an assignment can be rolled back to scheduled", () => {
    expect(canTransition("ASSIGNED", "SCHEDULED")).toBe(true);
  });
});
