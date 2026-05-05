import { NextResponse } from "next/server";

export function middleware(req) {
  const host = req.headers.get("host") || "";
  const subdomain = host.split(".")[0] || "";

  console.log("Subdomain:", subdomain);

  return NextResponse.next();
}

export const config = {
  matcher: ["/superadmin/:path*"],
};
