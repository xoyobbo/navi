import Footer from "@/components/Footer";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", top: 0, bottom: 0, left: 0, right: 0, overflowY: "auto", WebkitOverflowScrolling: "touch", background: "white" }}>
      <div className="max-w-2xl mx-auto px-6 py-12">
        {children}
      </div>
      <Footer />
    </div>
  );
}
