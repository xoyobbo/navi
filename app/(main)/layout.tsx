import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import UserSync from "@/components/UserSync";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <UserSync />
      <TopNav />
      <main
        className="pt-14"
        style={{
          background: "var(--color-bg)",
          paddingBottom: "calc(var(--nav-bottom-h) + env(safe-area-inset-bottom))",
          minHeight: "100dvh",
        }}
      >
        {children}
      </main>
      <BottomNav />
    </>
  );
}
