import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define which routes are public
const isPublicRoute = createRouteMatcher([
  '/api/diagnostic(.*)',
  '/api/notion/auth(.*)',
  '/api/notion/callback(.*)',
  '/diagnostic(.*)',
  '/terms(.*)',
  '/privacy(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    if (process.env.CLERK_SECRET_KEY) {
      await auth.protect();
    }
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
