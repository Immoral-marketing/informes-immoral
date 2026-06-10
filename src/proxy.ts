import { NextResponse, NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);

  const { pathname } = request.nextUrl;

  // Public routes — viewer and magic-link consumption
  const isPublicViewerRoute =
    /^\/[^/]+\/[^/]+(\/r\/[^/]+)?$/.test(pathname) &&
    !pathname.startsWith("/(");
  // Client portal — /{space}/portal and any sub-route (e.g. /{space}/portal/{slug}).
  // Auth here is handled server-side via hasValidPortalSession, not by employee login.
  const isPortalRoute = /^\/[^/]+\/portal(\/.*)?$/.test(pathname);
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth/");
  const isApiRoute = pathname.startsWith("/api/");

  if (isPublicViewerRoute || isPortalRoute || isAuthRoute || isApiRoute) {
    return response;
  }

  // Panel routes require authenticated session
  const supabase = createServerClient<Database>(
    process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Admin-only routes
  if (pathname.startsWith("/admin")) {
    const { data: rawProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const profile = rawProfile as { role: "admin" | "employee" } | null;

    if (profile?.role !== "admin") {
      const dashboardUrl = new URL("/", request.url);
      dashboardUrl.searchParams.set("error", "forbidden");
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

// Turbopack dev adapter — in production webpack builds Next.js injects this
// via its middleware template. Turbopack loads the raw module without that
// template, so `middlewareModule.default` is undefined and next-server.js
// throws "adapterFn is not a function". We export a compatible adapter here.
type NodeRequestData = {
  headers: Record<string, string | string[] | number | undefined>;
  method: string;
  url: string;
  body?: { cloneBodyStream(): ReadableStream<Uint8Array> };
  signal: AbortSignal;
};

export default async function proxyAdapter(opts: {
  handler: typeof proxy;
  request: NodeRequestData;
  page: string;
}): Promise<{ response: Response; waitUntil: Promise<void> }> {
  // Convert Node OutgoingHttpHeaders to Web Headers
  const headers = new Headers();
  for (const [key, val] of Object.entries(opts.request.headers)) {
    if (val === undefined) continue;
    if (Array.isArray(val)) {
      for (const v of val) headers.append(key, v);
    } else {
      headers.set(key, String(val));
    }
  }

  const hasBody = !["GET", "HEAD"].includes(opts.request.method) && !!opts.request.body;
  // NextRequest.RequestInit uses exactOptionalPropertyTypes; build signal separately
  const nextRequestInit = hasBody
    ? { method: opts.request.method, headers, body: opts.request.body!.cloneBodyStream() }
    : { method: opts.request.method, headers };
  const nextRequest = new NextRequest(opts.request.url, nextRequestInit);

  const result = await opts.handler(nextRequest);
  return {
    response: result ?? NextResponse.next(),
    waitUntil: Promise.resolve(),
  };
}
