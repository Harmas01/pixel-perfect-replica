import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { getBookingDateBounds, normalizeAdvanceDays } from "@/lib/settings";
import { getWorkdayStatus } from "@/routes/admin";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });
});

describe("Workday status", () => {
  it("shows the remaining workday time while the salon is open", () => {
    expect(getWorkdayStatus(new Date(2026, 0, 1, 20, 30))).toEqual({
      isOpen: true,
      text: "До конца рабочего дня: 30 мин",
    });
  });

  it("switches to the closed state at 21:00", () => {
    expect(getWorkdayStatus(new Date(2026, 0, 1, 21, 0))).toEqual({
      isOpen: false,
      text: "Салон закрыт · до открытия 13 ч",
    });
  });
});

describe("Booking window", () => {
  it("allows booking fourteen days ahead by default", () => {
    expect(getBookingDateBounds(14, new Date(2026, 0, 25, 18, 30))).toEqual({
      min: "2026-01-25",
      max: "2026-02-08",
    });
  });

  it("keeps the admin setting within one year", () => {
    expect(normalizeAdvanceDays(0)).toBe(1);
    expect(normalizeAdvanceDays(500)).toBe(365);
  });
});
