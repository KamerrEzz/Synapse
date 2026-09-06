import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthRoute = path === "/login" || path.startsWith("/auth");
  const isPublic =
    path === "/" ||
    isAuthRoute ||
    path.startsWith("/invite") ||
    path === "/api/mcp" ||
    path.startsWith("/.well-known/");

  if (!user && !isPublic) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", path);
    return NextResponse.redirect(login);
  }

  if (user && (path === "/login" || path === "/")) {
    return NextResponse.redirect(new URL("/workspaces", request.url));
  }

  return supabaseResponse;
}
