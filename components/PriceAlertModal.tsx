"use client";

import { useState } from "react";
import type { Product } from "@/types/product";

type Props = {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
};

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buf;
}

async function ensurePushSubscription(): Promise<boolean> {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return false;

  const perm = await Notification.requestPermission();
  if (perm !== "granted") return false;

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();

  if (!sub) {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return false;
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  }

  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON() }),
  });
  return true;
}

export default function PriceAlertModal({ product, isOpen, onClose }: Props) {
  const [targetPrice, setTargetPrice] = useState(
    Math.floor(product.price * 0.9).toString()
  );
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  async function handleSubmit() {
    const price = parseInt(targetPrice.replace(/,/g, ""), 10);
    if (isNaN(price) || price <= 0) {
      setErrorMsg("有効な価格を入力してください");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      // プッシュ通知の許可 + サブスクリプション登録
      await ensurePushSubscription();

      // 価格アラートを登録
      const res = await fetch("/api/price-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: product.id,
          product_name: product.name,
          product_url: product.affiliateUrl,
          source: product.source,
          target_price: price,
          current_price: product.price,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "登録に失敗しました");
      }

      setStatus("success");
      setTimeout(() => {
        setStatus("idle");
        onClose();
      }, 1500);
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "エラーが発生しました");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-sky-50 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="#0EA5E9" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          </div>
          <h2 className="text-sm font-bold text-gray-800">価格アラートを設定</h2>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 商品情報 */}
        <p className="text-xs text-gray-500 line-clamp-2 mb-1 leading-snug">{product.name}</p>
        <p className="text-base font-bold text-gray-900 mb-4">
          現在価格：¥{product.price.toLocaleString()}
        </p>

        {/* 目標価格入力 */}
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          この価格以下になったら通知
        </label>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-gray-500 font-bold">¥</span>
          <input
            type="number"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            placeholder={String(product.price)}
            min={1}
          />
        </div>

        {errorMsg && (
          <p className="text-xs text-red-500 mb-3">{errorMsg}</p>
        )}

        {/* ボタン */}
        {status === "success" ? (
          <div className="flex items-center justify-center gap-2 py-3 text-green-600 font-semibold text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            アラートを設定しました！
          </div>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={status === "loading"}
            className="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-semibold text-sm py-3 rounded-xl transition"
          >
            {status === "loading" ? "設定中..." : "通知を受け取る"}
          </button>
        )}

        <p className="text-center text-[10px] text-gray-400 mt-2">
          毎朝9時に価格をチェックします
        </p>
      </div>
    </div>
  );
}
