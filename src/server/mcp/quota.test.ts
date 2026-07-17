import { describe, expect, it } from "vitest";
import { isToolCallRequest } from "./quota";

describe("isToolCallRequest", () => {
  it("counts MCP tool calls", () => {
    expect(isToolCallRequest({ jsonrpc: "2.0", method: "tools/call", id: 1 })).toBe(true);
  });
  it("does not count initialization or tool discovery", () => {
    expect(isToolCallRequest({ method: "initialize" })).toBe(false);
    expect(isToolCallRequest({ method: "tools/list" })).toBe(false);
  });
  it("rejects batches and malformed values", () => {
    expect(isToolCallRequest([{ method: "tools/call" }])).toBe(false);
    expect(isToolCallRequest(null)).toBe(false);
  });
});
