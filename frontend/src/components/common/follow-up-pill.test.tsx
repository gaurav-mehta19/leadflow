import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FollowUpPill } from "@/components/common/follow-up-pill";

const NOW = new Date(2026, 4, 4, 13, 0);

describe("FollowUpPill", () => {
  it.each([
    ["overdue", new Date(2026, 4, 3, 11, 0), "overdue", "Overdue · 1d"],
    ["today", new Date(2026, 4, 4, 15, 0), "today", "Today 3:00 PM"],
    ["today", new Date(2026, 4, 4, 10, 0), "late", "Today 10:00 AM · 3h late"],
    ["upcoming", new Date(2026, 4, 5, 10, 0), "upcoming", "Tomorrow 10:00 AM"],
  ] as const)("renders a %s follow-up with the %s tone", (state, dueAt, tone, label) => {
    const { container } = render(
      <FollowUpPill dueAt={dueAt.toISOString()} state={state} now={NOW} />,
    );

    expect(screen.getByText(label)).toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute("data-tone", tone);
  });

  it("renders nothing without a follow-up", () => {
    const { container } = render(<FollowUpPill dueAt={NOW.toISOString()} state="none" now={NOW} />);

    expect(container).toBeEmptyDOMElement();
  });
});
