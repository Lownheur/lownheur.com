import { afterEach, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createLownheurMcpServer } from "./server";

describe("Lownheur MCP server", () => {
  const closers: Array<() => Promise<void>> = [];
  afterEach(async () => { await Promise.all(closers.splice(0).map((close) => close())); });

  it("publishes the complete V1 tool contract", async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createLownheurMcpServer({ client: {} as SupabaseClient, userId: "00000000-0000-4000-8000-000000000000" });
    const client = new Client({ name: "test", version: "1.0.0" });
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    closers.push(() => client.close(), () => server.close());
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(21);
    expect(tools.map((tool) => tool.name)).toEqual(expect.arrayContaining(["list_categories", "create_event", "update_goal", "delete_schedule", "get_upcoming_schedule"]));
    expect(tools.find((tool) => tool.name === "delete_category")?.annotations?.destructiveHint).toBe(true);
    expect(tools.every((tool) => tool._meta?.securitySchemes !== undefined)).toBe(true);
    expect(tools[0]?._meta?.securitySchemes).toEqual([
      { type: "oauth2", scopes: ["openid", "email", "profile"] }
    ]);
    const createCategory = tools.find((tool) => tool.name === "create_category");
    const updateEvent = tools.find((tool) => tool.name === "update_event");
    const createSchedule = tools.find((tool) => tool.name === "create_schedule");
    expect(createCategory?._meta?.["openai/fileParams"]).toEqual(["image"]);
    expect(updateEvent?._meta?.["openai/fileParams"]).toEqual(["image"]);
    expect(createSchedule?._meta?.["openai/fileParams"]).toBeUndefined();
    expect(createCategory?.inputSchema.properties).toHaveProperty("image");
    expect(createCategory?.inputSchema.properties).not.toHaveProperty("imagePath");
  });
});
