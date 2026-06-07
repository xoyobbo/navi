"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/chat",   label: "AI検索",    icon: "✦",  isMain: false },
  { href: "/search", label: "商品検索",  icon: "⌕",  isMain: true  },
  { href: "/mypage", label: "マイページ", icon: "⊙", isMain: false },
];

export default function BottomNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav
      // display は className の `flex md:hidden` で制御する（スマホ=flex / PC≥768px=非表示）。
      // ここで display:flex をインライン指定すると md:hidden を上書きしてPCに漏れるため指定しない。
      className="flex md:hidden"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: "rgba(247,246,243,0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderTop: "0.5px solid var(--navi-border)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: item.isMain ? "4px 0 8px" : "8px 0",
            textDecoration: "none",
            position: "relative",
          }}
        >
          {item.isMain ? (
            <div style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: "var(--navi-black)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              color: "white",
              marginBottom: "2px",
              marginTop: "-12px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
            }}>
              {item.icon}
            </div>
          ) : (
            <span style={{ fontSize: "20px", marginBottom: "1px", color: isActive(item.href) ? "var(--navi-black)" : "var(--navi-text-hint)" }}>
              {item.icon}
            </span>
          )}
          <span style={{
            fontSize: "10px",
            letterSpacing: "0.02em",
            fontWeight: isActive(item.href) ? "600" : "400",
            color: isActive(item.href) ? "var(--navi-black)" : "var(--navi-text-hint)",
          }}>
            {item.label}
          </span>
        </Link>
      ))}
    </nav>
  );
}
