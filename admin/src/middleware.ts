import { NextRequest, NextResponse } from 'next/server';

/**
 * Keep in step with ADMIN_KEY_COOKIE in lib/admin-key.ts. Not imported from
 * there directly: that file pulls in `next/headers` (App Router server
 * components) and `server-only`, neither of which is meant for the
 * middleware/edge runtime, which has its own `NextRequest.cookies` API.
 */
const ADMIN_KEY_COOKIE = 'admin_key';

/**
 * C5.1: the dashboard has no login of its own to lose — every route but
 * /login requires the admin_key cookie a staffer gets by signing in with
 * their personal key (see login/actions.ts). Without this, anyone who
 * reaches the dashboard's URL acted as whichever key the deployment held.
 */
export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/login')) return NextResponse.next();

  if (!req.cookies.get(ADMIN_KEY_COOKIE)?.value) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
