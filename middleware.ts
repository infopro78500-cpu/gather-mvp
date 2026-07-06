import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

export function middleware(request: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    console.error("[Admin auth] ADMIN_PASSWORD is not set — blocking access.");
    return new NextResponse("Admin non configuré.", { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  const expected = `Basic ${Buffer.from(`admin:${password}`).toString("base64")}`;

  if (authHeader === expected) {
    return NextResponse.next();
  }

  return new NextResponse("Authentification requise.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Gather Admin"' },
  });
}
