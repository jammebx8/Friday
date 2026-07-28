import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");



  if (code) {
    const supabase = await createClient();

   

    const { error } = await supabase.auth.exchangeCodeForSession(code);

if (!error) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase.from("users").upsert({
      id: user.id,
      email: user.email,
      name: user.user_metadata.full_name,
      avatar_url:
        user.user_metadata.avatar_url ??
        user.user_metadata.picture,
    });
  }

  return NextResponse.redirect(`${origin}/chat`);
}

    if (!error) {
      return NextResponse.redirect(`${origin}/chat`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}