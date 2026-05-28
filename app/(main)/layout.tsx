import TopNav from "@/components/TopNav";
import UserSync from "@/components/UserSync";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <UserSync />
      <TopNav />
      <div className="pt-24 min-h-screen bg-white">
        {children}
      </div>
    </>
  );
}
