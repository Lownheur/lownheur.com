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
    expect(tools).toHaveLength(30);
    expect(tools.map((tool) => tool.name)).toEqual(expect.arrayContaining([
      "list_categories",
      "create_event",
      "update_goal",
      "delete_schedule",
      "get_upcoming_schedule",
      "set_category_image",
      "add_event_image",
      "add_goal_image",
      "list_category_images",
      "remove_goal_image"
    ]));
    expect(tools.find((tool) => tool.name === "delete_category")?.annotations?.destructiveHint).toBe(true);
    expect(tools.every((tool) => tool._meta?.securitySchemes !== undefined)).toBe(true);
    expect(tools[0]?._meta?.securitySchemes).toEqual([
      { type: "oauth2", scopes: ["openid", "email", "profile"] }
    ]);
    const createSchedule = tools.find((tool) => tool.name === "create_schedule");
    expect(createSchedule?._meta?.["openai/fileParams"]).toBeUndefined();
    const imageTools = [
      "create_category", "update_category", "set_category_image",
      "create_event", "update_event", "add_event_image",
      "create_goal", "update_goal", "add_goal_image"
    ];
    for (const toolName of imageTools) {
      const tool = tools.find((candidate) => candidate.name === toolName);
      expect(tool?._meta?.["openai/fileParams"], toolName).toEqual(["image"]);
      expect(tool?.inputSchema.properties, toolName).toHaveProperty("image");
      expect(JSON.stringify(tool?.inputSchema), toolName).not.toContain("imagePath");
    }
    expect(JSON.stringify(tools)).not.toContain("imagePath");
  });
});
