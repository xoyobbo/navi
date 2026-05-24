"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

// ログイン直後に /api/user/sync を叩いて Supabase に upsert する
export default function UserSync() {
  const { isSignedIn, userId } = useAuth();
  const syncedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isSignedIn || !userId) return;
    if (syncedRef.current === userId) return;

    syncedRef.current = userId;
    fetch("/api/user/sync", { method: "POST" }).catch(console.error);
  }, [isSignedIn, userId]);

  return null;
}
