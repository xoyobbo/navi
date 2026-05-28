import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { logAction } from "@/lib/tracking";
import type { ActionPayload } from "@/lib/tracking";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false });

  let payload: ActionPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエスト" }, { status: 400 });
  }

  // 非同期で記録（レスポンスをブロックしない）
  logAction(userId, payload).catch(console.error);

  return NextResponse.json({ ok: true });
}
