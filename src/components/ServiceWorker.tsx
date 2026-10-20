"use client";
import { useEffect } from "react";
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch((e) => console.error("Service worker non enregistré :", e));
  }, []);
  return null;
}
