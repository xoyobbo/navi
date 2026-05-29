const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CLERK_SIGN_IN_URL",
  "NEXT_PUBLIC_CLERK_SIGN_UP_URL",
  "NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL",
  "NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "RAKUTEN_APP_ID",
  "YAHOO_CLIENT_ID",
  "ANTHROPIC_API_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "RAKUTEN_AFFILIATE_ID",
];

export const checkEnvVars = () => {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("❌ 未設定の環境変数：", missing.join(", "));
  } else {
    console.log("✅ 環境変数：全て設定済み");
  }

  return missing;
};
