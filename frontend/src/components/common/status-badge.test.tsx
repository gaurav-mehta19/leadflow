import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusBadge } from "@/components/common/status-badge";
import { LEAD_STATUSES, STATUS_CONFIG } from "@/config/statuses";

describe("StatusBadge", () => {
  it.each(LEAD_STATUSES)("renders the %s label next to a coloured dot", (status) => {
    const { container } = render(<StatusBadge status={status} />);

    const config = STATUS_CONFIG[status];
    expect(screen.getByText(config.label)).toBeInTheDocument();
    const dot = container.querySelector('[data-slot="status-dot"]');
    expect(dot).toHaveAttribute("aria-hidden", "true");
    expect(dot?.className).toContain(config.tone.dot);
  });
});
