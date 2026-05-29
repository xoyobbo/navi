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
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          overscrollBehavior: "contain",
          background: "var(--color-bg)",
          paddingTop: "var(--nav-top-h)",
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
