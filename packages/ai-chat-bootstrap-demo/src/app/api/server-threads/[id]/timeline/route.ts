import type { NextRequest } from "next/server";
import {
  getThreadTimeline,
  upsertThreadTimeline,
} from "@/server/custom-thread-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: { id: string } }
) {
  const params = await context.params;
  const timeline = await getThreadTimeline(params.id);
  return Response.json(timeline);
}

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const payload = (await request.json()) as unknown;
  if (!payload || typeof payload !== "object") {
    return new Response("Invalid timeline payload", { status: 400 });
  }

  const params = await context.params;
  await upsertThreadTimeline({
    ...(payload as Record<string, unknown>),
    threadId: params.id,
  } as never);
  return new Response(null, { status: 204 });
}
