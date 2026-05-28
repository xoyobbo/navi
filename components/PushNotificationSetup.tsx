"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";

export default function PushNotificationSetup() {
  const { isSignedIn } = useUser();

  useEffect(() => {
    if (!isSignedIn || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, [isSignedIn]);

  return null;
}
