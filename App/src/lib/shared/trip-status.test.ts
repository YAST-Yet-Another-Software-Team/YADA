import { describe, expect, it } from "vitest";

import type { TripStatus } from "$lib/utils/types";

import {
  ACTIVE_TRIP_STATUSES,
  CLOSED_TRIP_STATUSES,
  courierTripHref,
  isCancellableByBusiness,
  isCancellableStage,
  isPickupPhase,
  isReleasableByCourier,
  toDispatchStage,
  toTripPhase,
  toTripStage,
} from "./trip-status";

/**
 * The trip state machine, as both workspaces read it.
 *
 * The stored statuses and the stages shown on screen are deliberately
 * different vocabularies, and the collapses between them carry product
 * decisions — which is why they are asserted as a table rather than
 * spot-checked. Getting one wrong shows the wrong screen to someone standing
 * at a counter.
 */

const EVERY_STATUS: TripStatus[] = [
  "requested",
  "accepted",
  "courier_arriving",
  "arrived",
  "picked_up",
  "in_progress",
  "completed",
  "cancelled",
];

describe("toTripStage", () => {
  it.each([
    ["requested", "searching"],
    ["accepted", "assigned"],
    ["courier_arriving", "arrived"],
    ["arrived", "arrived"],
    ["picked_up", "arrived"],
    ["in_progress", "en_route"],
    ["completed", "delivered"],
    ["cancelled", "cancelled"],
  ])("maps %s to %s", (status, stage) => {
    expect(toTripStage(status)).toBe(stage);
  });

  /**
   * To a pill these are the same moment — the courier is at the shop. Screens
   * that must act on the difference read the stored status instead.
   */
  it("collapses the three at-the-counter statuses onto one stage", () => {
    const stages = ["courier_arriving", "arrived", "picked_up"].map(
      toTripStage,
    );
    expect(new Set(stages)).toEqual(new Set(["arrived"]));
  });

  it("falls back to searching for anything unrecognised", () => {
    expect(toTripStage("not_a_status")).toBe("searching");
    expect(toTripStage("")).toBe("searching");
  });
});

describe("toDispatchStage", () => {
  /**
   * The business board tracks the parcel, not the rider: once it has left the
   * counter it reads as en route, even though the courier still has to press
   * "Start delivery".
   */
  it("reads picked_up as en route", () => {
    expect(toDispatchStage("picked_up")).toBe("en_route");
    expect(toTripStage("picked_up")).toBe("arrived");
  });

  it("keeps courier_arriving visible as its own state", () => {
    // It is the business's cue to confirm the handover, so it must not collapse.
    expect(toDispatchStage("courier_arriving")).toBe("arrived");
  });

  it("agrees with toTripStage everywhere else", () => {
    for (const status of EVERY_STATUS) {
      if (status === "picked_up") continue;
      expect(toDispatchStage(status)).toBe(toTripStage(status));
    }
  });
});

describe("toTripPhase / isPickupPhase", () => {
  it("treats the parcel as still on the counter before the handover", () => {
    for (const status of ["accepted", "courier_arriving", "arrived"]) {
      expect(isPickupPhase(status)).toBe(true);
      expect(toTripPhase(status)).toBe("pickup");
    }
  });

  it("counts picked_up as delivery — the parcel is with the courier", () => {
    expect(isPickupPhase("picked_up")).toBe(false);
    expect(toTripPhase("picked_up")).toBe("delivery");
  });

  it("counts in_progress as delivery", () => {
    expect(toTripPhase("in_progress")).toBe("delivery");
  });
});

describe("cancellation windows", () => {
  it("lets a business call it off while searching or newly assigned", () => {
    expect(isCancellableByBusiness("requested")).toBe(true);
    expect(isCancellableByBusiness("accepted")).toBe(true);
  });

  /**
   * The rider is at the counter by then — the position that writes this status
   * is what proves it. Calling it off from a screen at that point leaves
   * someone standing there; that is a conversation, not a button.
   */
  it("closes the window the moment the rider reaches the counter", () => {
    expect(isCancellableByBusiness("courier_arriving")).toBe(false);
  });

  it("is closed for every later status", () => {
    for (const status of [
      "arrived",
      "picked_up",
      "in_progress",
      "completed",
      "cancelled",
    ]) {
      expect(isCancellableByBusiness(status)).toBe(false);
    }
  });

  it("lets a courier release only a job they hold and have not started", () => {
    expect(isReleasableByCourier("accepted")).toBe(true);
    for (const status of EVERY_STATUS.filter((s) => s !== "accepted")) {
      expect(isReleasableByCourier(status)).toBe(false);
    }
  });

  it("agrees with the stage-level window the business screens use", () => {
    expect(isCancellableStage("searching")).toBe(true);
    expect(isCancellableStage("assigned")).toBe(true);
    for (const stage of [
      "arrived",
      "en_route",
      "delivered",
      "cancelled",
    ] as const) {
      expect(isCancellableStage(stage)).toBe(false);
    }
  });
});

describe("courierTripHref", () => {
  it("sends the delivery leg to /deliver and everything else to /pickup", () => {
    expect(courierTripHref({ id: "t1", status: "in_progress" })).toBe(
      "/deliver?tripId=t1",
    );
    for (const status of EVERY_STATUS.filter((s) => s !== "in_progress")) {
      expect(courierTripHref({ id: "t1", status })).toBe("/pickup?tripId=t1");
    }
  });

  it("keeps picked_up on the pickup screen, where Start delivery lives", () => {
    expect(courierTripHref({ id: "t1", status: "picked_up" })).toContain(
      "/pickup",
    );
  });

  it("encodes the id", () => {
    expect(courierTripHref({ id: "a b&c", status: "accepted" })).toBe(
      "/pickup?tripId=a%20b%26c",
    );
  });
});

describe("status groupings", () => {
  it("splits every status into exactly one of active or closed", () => {
    const active = new Set<string>(ACTIVE_TRIP_STATUSES);
    const closed = new Set<string>(CLOSED_TRIP_STATUSES);

    // `requested` is neither: nobody is on the hook for it yet.
    expect(active.has("requested")).toBe(false);
    expect(closed.has("requested")).toBe(false);

    for (const status of EVERY_STATUS.filter((s) => s !== "requested")) {
      expect(active.has(status) !== closed.has(status)).toBe(true);
    }
  });
});
