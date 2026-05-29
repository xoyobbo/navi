import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import UserSync from "@/components/UserSync";
import Footer from "@/components/Footer";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <UserSync />
      <TopNav />
      <main
        style={{
          position: "fixed",
          top: "var(--nav-top-h)",
          bottom: 0,
          left: 0,
          right: 0,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
          background: "var(--color-bg)",
          paddingBottom: "calc(var(--nav-bottom-h) + env(safe-area-inset-bottom))",
        }}
      >
        {children}
        <Footer />
      </main>
      <BottomNav />
    </>
  );
}
