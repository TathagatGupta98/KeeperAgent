/**
 * Status normalization tests.
 */

import { describe, it, expect } from "vitest";
import {
  normalizeWorkflowStatus,
  normalizeDirectStatus,
  normalizeStatus,
} from "../../models/status.js";

describe("normalizeWorkflowStatus", () => {
  it('maps "pending" → "queued"', () => {
    expect(normalizeWorkflowStatus("pending")).toBe("queued");
  });
  it('maps "running" → "in_progress"', () => {
    expect(normalizeWorkflowStatus("running")).toBe("in_progress");
  });
  it('maps "success" → "succeeded"', () => {
    expect(normalizeWorkflowStatus("success")).toBe("succeeded");
  });
  it('maps "error" → "failed"', () => {
    expect(normalizeWorkflowStatus("error")).toBe("failed");
  });
  it('maps "cancelled" → "cancelled"', () => {
    expect(normalizeWorkflowStatus("cancelled")).toBe("cancelled");
  });
});

describe("normalizeDirectStatus", () => {
  it('maps "completed" → "succeeded"', () => {
    expect(normalizeDirectStatus("completed")).toBe("succeeded");
  });
  it('maps "failed" → "failed"', () => {
    expect(normalizeDirectStatus("failed")).toBe("failed");
  });
});

describe("normalizeStatus (generic)", () => {
  it("handles workflow vocab", () => {
    expect(normalizeStatus("success")).toBe("succeeded");
    expect(normalizeStatus("error")).toBe("failed");
  });
  it("handles direct exec vocab", () => {
    expect(normalizeStatus("completed")).toBe("succeeded");
  });
  it("handles shared vocab", () => {
    expect(normalizeStatus("pending")).toBe("queued");
    expect(normalizeStatus("running")).toBe("in_progress");
  });
});
