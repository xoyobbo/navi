import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUserPreferences } from "@/lib/preferences";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ preferences: null });

  const preferences = await getUserPreferences(userId);
  return NextResponse.json({ preferences });
}
