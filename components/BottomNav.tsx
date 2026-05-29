"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/chat",   label: "AI検索",   emoji: "🤖" },
  { href: "/search", label: "商品検索", emoji: "🔍" },
  { href: "/mypage", label: "マイページ", emoji: "👤" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex md:hidden"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: "white",
        borderTop: "1px solid var(--color-border)",
        paddingBottom: "env(safe-area-inset-bottom)",
        boxShadow: "0 -2px 10px rgba(0,0,0,0.06)",
      }}
    >
      {navItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "8px 0",
              minHeight: "56px",
              color: active ? "var(--color-primary)" : "var(--color-text-sub)",
              textDecoration: "none",
              gap: "3px",
              WebkitUserSelect: "none",
            }}
          >
            <span style={{ fontSize: "22px", lineHeight: 1 }}>{item.emoji}</span>
            <span
              style={{
                fontSize: "10px",
                fontWeight: active ? 700 : 400,
                letterSpacing: "0.01em",
              }}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
