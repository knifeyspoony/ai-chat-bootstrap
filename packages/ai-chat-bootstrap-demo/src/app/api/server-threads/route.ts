import type { NextRequest } from "next/server";
import { listThreadSummaries } from "@/server/custom-thread-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const scopeKey = request.nextUrl.searchParams.get("scopeKey");
  const summaries = await listThreadSummaries(scopeKey);
  return Response.json(summaries);
}
