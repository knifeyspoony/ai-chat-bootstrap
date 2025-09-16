import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "node:crypto";
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";

const DEFAULT_PORT = 3030;
const DEFAULT_PATH = "/mcp";

const port = Number.parseInt(process.env.MCP_PORT ?? `${DEFAULT_PORT}`, 10);
const host = process.env.MCP_HOST ?? "127.0.0.1";
const path = process.env.MCP_PATH ?? DEFAULT_PATH;
const normalizedPath = normalizePath(path);

const demoMcpServer = new McpServer(
  {
    name: "ai-chat-bootstrap-demo",
    version: "0.1.0",
    description:
      "Sample MCP server bundled with the AI Chat Bootstrap demo showcasing tool integration.",
  },
  {
    capabilities: {
      logging: {},
      sampling: {},
    },
  }
);

const SAMPLE_FORECASTS: Record<
  string,
  { summary: string; high: number; low: number; conditions: string[] }
> = {
  seattle: {
    summary: "Cool with light showers",
    high: 58,
    low: 46,
    conditions: ["rain", "clouds"],
  },
  "san francisco": {
    summary: "Mild with coastal fog",
    high: 64,
    low: 52,
    conditions: ["fog", "breeze"],
  },
  denver: {
    summary: "Sunny with afternoon thunderstorms",
    high: 82,
    low: 55,
    conditions: ["sun", "storms"],
  },
};

const weatherToolInputShape = {
  city: z
    .string()
    .min(1, { message: "Provide a city name to fetch a forecast." })
    .describe("City to look up. Try Seattle, San Francisco, or Denver."),
  units: z
    .enum(["imperial", "metric"])
    .default("imperial")
    .describe("Units for temperature in the response."),
} as const;

const weatherToolInputSchema = z
  .object({
    city: weatherToolInputShape.city,
    units: weatherToolInputShape.units,
  })
  .strict();

demoMcpServer.registerTool(
  "demo_weather_forecast",
  {
    title: "Demo Weather Forecast",
    description:
      "Return a playful weather forecast for a supported city. Useful for demonstrating MCP tool calls.",
    inputSchema: weatherToolInputShape as any,
  },
  (async (args: unknown) => {
    const { city, units } = weatherToolInputSchema.parse(args);
    const key = city.trim().toLowerCase();
    const forecast = SAMPLE_FORECASTS[key];
    if (!forecast) {
      return {
        content: [
          {
            type: "text",
            text: `I only have sample forecasts for Seattle, San Francisco, or Denver right now. I couldn't find "${city}".`,
          },
        ],
      };
    }

    const convertTemperature = (value: number) =>
      units === "metric" ? Math.round(((value - 32) * 5) / 9) : value;

    const formatTemperature = (value: number) => {
      const temperature = convertTemperature(value);
      return `${temperature}°${units === "metric" ? "C" : "F"}`;
    };

    const { summary, high, low, conditions } = forecast;
    const response = `Here's the latest vibe for ${capitalizeWords(
      city
    )}: ${summary}. Expect a high of ${formatTemperature(
      high
    )} and a low around ${formatTemperature(low)}. Conditions to watch: ${
      conditions.length > 0 ? conditions.join(", ") : "clear skies"
    }.`;

    return {
      content: [
        {
          type: "text",
          text: response,
        },
      ],
    };
  }) as any
);

const meetingAgendaInputShape = {
  topic: z
    .string()
    .default("AI product sync")
    .describe("Main theme for the meeting."),
  attendees: z
    .array(z.string())
    .default(["Ada", "Grace", "Linus"])
    .describe("List of attendees to assign topics to."),
  durationMinutes: z
    .number()
    .min(15)
    .max(120)
    .default(45)
    .describe("How long the meeting should run."),
} as const;

const meetingAgendaInputSchema = z
  .object({
    topic: meetingAgendaInputShape.topic,
    attendees: meetingAgendaInputShape.attendees,
    durationMinutes: meetingAgendaInputShape.durationMinutes,
  })
  .strict();

demoMcpServer.registerTool(
  "demo_meeting_agenda",
  {
    title: "Generate Meeting Agenda",
    description:
      "Create a structured meeting agenda with topics and owners using a light-weight prompt.",
    inputSchema: meetingAgendaInputShape as any,
  },
  (async (args: unknown) => {
    const { topic, attendees, durationMinutes } =
      meetingAgendaInputSchema.parse(args);
    const sanitizedAttendees: string[] =
      attendees.length > 0 ? attendees : ["Facilitator"];
    const focusTopics = [
      "Highlights & wins",
      "Key metric review",
      "Risks & blockers",
      "Next sprint focus",
    ];

    const sections = sanitizedAttendees.map((person, index) => {
      const focus = focusTopics[index % focusTopics.length];
      return `- ${focus} — led by ${person}`;
    });

    const agenda = `Agenda for ${topic} (${durationMinutes} minutes):\n${sections.join(
      "\n"
    )}\n- Action items & wrap-up`;

    return {
      content: [
        {
          type: "text",
          text: agenda,
        },
      ],
    };
  }) as any
);

function capitalizeWords(text: string) {
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
}

function applyCorsHeaders(res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Mcp-Session-Id, Accept"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
}

async function readRequestBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  let totalLength = 0;
  return new Promise<unknown>((resolve, reject) => {
    req
      .on("data", (chunk) => {
        const bufferChunk = Buffer.isBuffer(chunk)
          ? (chunk as Buffer)
          : Buffer.from(chunk);
        chunks.push(bufferChunk);
        totalLength += bufferChunk.length;
        if (totalLength > 4 * 1024 * 1024) {
          reject(new Error("Request body too large"));
        }
      })
      .on("end", () => {
        if (chunks.length === 0) {
          resolve(undefined);
          return;
        }
        try {
          const raw = Buffer.concat(chunks, totalLength).toString("utf-8");
          resolve(raw ? JSON.parse(raw) : undefined);
        } catch (error) {
          reject(error);
        }
      })
      .on("error", reject);
  });
}

async function main() {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });

  await demoMcpServer.connect(transport);

  const server = createServer(async (req, res) => {
    if (!req.url) {
      res.writeHead(400).end("Missing URL");
      return;
    }

    const requestUrl = new URL(req.url, `http://${req.headers.host ?? host}`);
    const requestPath = normalizePath(requestUrl.pathname ?? "/");
    if (requestPath !== normalizedPath) {
      res.writeHead(404).end("Not Found");
      return;
    }

    if (req.method === "OPTIONS") {
      applyCorsHeaders(res);
      res.writeHead(204).end();
      return;
    }

    applyCorsHeaders(res);

    try {
      if (req.method === "POST") {
        const body = await readRequestBody(req);
        await transport.handleRequest(req, res, body);
      } else if (req.method === "GET" || req.method === "DELETE") {
        await transport.handleRequest(req, res);
      } else {
        res.writeHead(405).end("Method Not Allowed");
      }
    } catch (error) {
      console.error("[mcp-demo] request handling failed", error);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
      }
      if (!res.writableEnded) {
        res.end(JSON.stringify({ error: "Internal MCP server error" }));
      }
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      console.log(
        `[mcp-demo] server listening on http://${host}:${port}${path}`
      );
      resolve();
    });
  });

  const shutdown = async () => {
    console.log("[mcp-demo] shutting down");
    server.close();
    await demoMcpServer.close().catch(() => undefined);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

function normalizePath(value: string) {
  if (value === "/") return value;
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

main().catch((error) => {
  console.error("[mcp-demo] failed to start", error);
  process.exit(1);
});
