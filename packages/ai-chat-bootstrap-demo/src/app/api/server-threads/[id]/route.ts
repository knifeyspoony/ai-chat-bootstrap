import type { NextRequest } from "next/server";
import {
  deleteThreadRecord,
  upsertThreadRecord,
} from "@/server/custom-thread-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const payload = (await request.json()) as unknown;
  if (!payload || typeof payload !== "object") {
    return new Response("Invalid record payload", { status: 400 });
  }

  const params = await context.params;
  const record = {
    ...(payload as Record<string, unknown>),
    id: params.id,
  } as never;

  await upsertThreadRecord(record);
  return new Response(null, { status: 204 });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: { id: string } }
) {
  const params = await context.params;
  await deleteThreadRecord(params.id);
  return new Response(null, { status: 204 });
}
