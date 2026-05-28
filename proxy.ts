import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/rakuten(.*)",
  "/api/yahoo(.*)",
  "/api/search(.*)",
  "/api/product/by-id",  // 商品詳細フォールバック（認証不要）
  "/api/price-check",    // Cron Job — CRON_SECRET で独自認証
  "/api/actions",        // 未認証は route 内で無視
  "/api/preferences",    // 未認証は null を返す
  "/api/push(.*)",       // Web Push（認証不要）
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
