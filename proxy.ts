import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// ゲストでもアクセス可能なルート（購入・閲覧はログイン不要）
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/privacy",
  "/about",
  "/contact",
  "/home(.*)",
  "/search(.*)",
  "/chat(.*)",
  "/product(.*)",
  "/api/rakuten(.*)",
  "/api/yahoo(.*)",
  "/api/search(.*)",
  "/api/ai(.*)",
  "/api/product(.*)",
  "/api/price-check",
  "/api/actions",
  "/api/preferences",
  "/api/push(.*)",
  "/api/extract-keyword(.*)",
  "/api/history(.*)",
]);

// ログインが必須なルート（個人情報・お気に入り・設定）
const isProtectedRoute = createRouteMatcher([
  "/mypage(.*)",
  "/settings(.*)",
  "/api/favorites(.*)",
  "/api/learning(.*)",
  "/api/user(.*)",
  "/api/price-alerts(.*)",
  "/api/sessions(.*)",
  "/api/feedback(.*)",
  "/api/track(.*)",
]);

const TWO_WEEKS_SECONDS = 14 * 24 * 60 * 60;

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

  // 2週間以上ログインがない場合は再ログインを要求
  if (userId && sessionClaims) {
    const iat = sessionClaims.iat as number | undefined;
    if (iat && Date.now() / 1000 - iat > TWO_WEEKS_SECONDS) {
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("redirect_url", req.url);
      return NextResponse.redirect(signInUrl);
    }
  }

  // 保護ルートは要ログイン
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
