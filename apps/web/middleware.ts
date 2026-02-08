import { NextRequest, NextResponse } from 'next/server'

/**
 * Next.js middleware - simplified
 * Tracking now handled by client-side script + API endpoint
 * (Edge Runtime doesn't support file system operations)
 */
export async function middleware(request: NextRequest) {
  // Just pass through - tracking happens via API
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
