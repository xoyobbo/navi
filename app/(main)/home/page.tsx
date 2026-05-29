import { redirect } from "next/navigation";

// /home は /search にリダイレクト
export default function HomePage() {
  redirect("/search");
}
