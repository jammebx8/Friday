import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Supabase redirects here after Google finishes authenticating.
// We exchange the temporary `code` for a real session (sets auth cookies),
// then send the browser to the home page. The home page picks up from
// there to sync the row in `users` and populate localStorage, since
// localStorage can only be touched client-side.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Something went wrong — send the user back to login with an error flag.
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
