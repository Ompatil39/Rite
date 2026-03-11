import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const redirectUri = `${origin}/auth/callback`;

  const params = new URLSearchParams({
    client_id: process.env.OAUTH_CLIENT_ID || "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
  });

  const providerAuthUrl = process.env.OAUTH_PROVIDER_URL || "https://accounts.google.com/o/oauth2/v2/auth";
  const authUrl = `${providerAuthUrl}?${params.toString()}`;

  return NextResponse.json({ url: authUrl });
}
