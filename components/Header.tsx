"use client";

import { SignInButton, SignOutButton, useAuth, useUser } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <header style={{
      position: "sticky",
      top: 0,
      zIndex: 100,
      background: "rgba(247,246,243,0.85)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderBottom: "0.5px solid var(--navi-border)",
      padding: "0 16px",
      height: "56px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
    }}>

      {/* ロゴ */}
      <Link href="/chat" style={{
        display: "flex",
        flexDirection: "column",
        textDecoration: "none",
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: "18px",
          fontWeight: "700",
          color: "var(--navi-black)",
          letterSpacing: "0.06em",
          lineHeight: 1,
        }}>
          Navi
        </span>
        <span style={{
          fontSize: "9px",
          color: "var(--navi-gold)",
          letterSpacing: "0.12em",
          fontWeight: "500",
        }}>
          AI SHOPPING
        </span>
      </Link>

      {/* タブ */}
      <div style={{
        display: "flex",
        background: "rgba(0,0,0,0.05)",
        borderRadius: "20px",
        padding: "3px",
        gap: "2px",
      }}>
        {[
          { href: "/chat", label: "AI検索" },
          { href: "/search", label: "商品検索" },
        ].map((tab) => (
          <Link key={tab.href} href={tab.href} style={{
            padding: "6px 14px",
            borderRadius: "17px",
            fontSize: "13px",
            fontWeight: isActive(tab.href) ? "600" : "400",
            background: isActive(tab.href) ? "white" : "transparent",
            color: isActive(tab.href) ? "var(--navi-black)" : "var(--navi-text-sub)",
            textDecoration: "none",
            whiteSpace: "nowrap",
            transition: "all 0.2s",
            boxShadow: isActive(tab.href) ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
          }}>
            {tab.label}
          </Link>
        ))}
      </div>

      {/* 右エリア */}
      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
        {isSignedIn ? (
          <>
            <Link href="/mypage/favorites" style={{
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              color: "var(--navi-text-sub)",
              textDecoration: "none",
              fontSize: "18px",
            }}>
              ♡
            </Link>
            <Link href="/mypage" style={{
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              textDecoration: "none",
            }}>
              {user?.imageUrl ? (
                <Image
                  src={user.imageUrl}
                  alt={user.fullName ?? "ユーザー"}
                  width={28}
                  height={28}
                  style={{ borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                <span style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "var(--navi-black)",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: "600",
                }}>
                  {user?.firstName?.[0] ?? "U"}
                </span>
              )}
            </Link>
          </>
        ) : (
          <SignInButton mode="redirect">
            <button style={{
              background: "var(--navi-black)",
              color: "white",
              border: "none",
              borderRadius: "var(--navi-radius-sm)",
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
            }}>
              ログイン
            </button>
          </SignInButton>
        )}
      </div>
    </header>
  );
}
