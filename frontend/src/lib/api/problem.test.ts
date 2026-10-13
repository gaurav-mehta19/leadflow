import { describe, expect, it } from "vitest";

import { ApiError, apiErrorFromResponse, networkError, parseProblem } from "@/lib/api/problem";

describe("parseProblem", () => {
  it("maps field errors, request id and extensions", () => {
    const error = parseProblem(
      {
        type: "https://leadflow.dev/problems/duplicate-phone",
        title: "Duplicate phone number",
        status: 409,
        detail: "A lead with this phone number already exists.",
        instance: "/api/v1/leads",
        request_id: "req-1",
        errors: [{ field: "phone", message: "Already used by Ananya Iyer" }],
        existing_lead_id: "lead-1",
        existing_lead_name: "Ananya Iyer",
      },
      409,
      null,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(409);
    expect(error.title).toBe("Duplicate phone number");
    expect(error.fieldErrors).toEqual({ phone: "Already used by Ananya Iyer" });
    expect(error.hasFieldErrors).toBe(true);
    expect(error.requestId).toBe("req-1");
    expect(error.extensionString("existing_lead_id")).toBe("lead-1");
    expect(error.extensions).not.toHaveProperty("instance");
  });

  it("handles problems without field errors", () => {
    const error = parseProblem(
      { title: "Lead not found", status: 404, detail: "No lead exists.", errors: [] },
      404,
      "req-2",
    );

    expect(error.hasFieldErrors).toBe(false);
    expect(error.detail).toBe("No lead exists.");
    expect(error.requestId).toBe("req-2");
    expect(error.isRetryable).toBe(false);
  });

  it("keeps the first message when a field has several errors", () => {
    const error = parseProblem(
      {
        status: 422,
        errors: [
          { field: "name", message: "First" },
          { field: "name", message: "Second" },
        ],
      },
      422,
      null,
    );

    expect(error.fieldErrors).toEqual({ name: "First" });
  });

  it("falls back to a generic error for bodies that are not problems", () => {
    const error = parseProblem("<html>Bad Gateway</html>", 502, "req-3");

    expect(error.status).toBe(502);
    expect(error.title).toBe("Something went wrong");
    expect(error.requestId).toBe("req-3");
    expect(error.isRetryable).toBe(true);
  });
});

describe("apiErrorFromResponse", () => {
  it("reads problem+json responses", async () => {
    const response = new Response(
      JSON.stringify({ title: "Validation failed", status: 422, detail: "Bad", errors: [] }),
      { status: 422, headers: { "content-type": "application/problem+json" } },
    );

    const error = await apiErrorFromResponse(response);

    expect(error.title).toBe("Validation failed");
  });

  it("uses the X-Request-ID header when the body is not JSON", async () => {
    const response = new Response("upstream exploded", {
      status: 500,
      headers: { "X-Request-ID": "req-header" },
    });

    const error = await apiErrorFromResponse(response);

    expect(error.status).toBe(500);
    expect(error.requestId).toBe("req-header");
  });
});

describe("networkError", () => {
  it("has status 0 and a friendly title", () => {
    const error = networkError();

    expect(error.status).toBe(0);
    expect(error.isNetworkError).toBe(true);
    expect(error.isRetryable).toBe(true);
    expect(error.title).toBe("Can't reach the server");
  });
});
