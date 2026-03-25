import { NextResponse } from "next/server";

/**
 * POST /api/notion/logout
 * Clears the Notion access token cookie and redirects to home.
 */
export async function POST() {
  const response = NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL || "https://syndicate-sentinel.vercel.app"}/`
  );

  response.cookies.set("notion_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}
