'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';

export interface AppUser {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
}

const LOCAL_STORAGE_KEY = 'friday_user';

/**
 * Runs once on mount (intended for the post-login landing page, app/page.tsx).
 *
 * 1. Reads the current Supabase auth session.
 * 2. Looks the user up by id in the `users` table.
 *    - Found  -> use that row.
 *    - Missing -> this is their first sign-in, so insert a new row using
 *      the profile data Google/Supabase gave us.
 * 3. Saves the resulting row to localStorage under `friday_user` for the
 *    rest of the app to read synchronously.
 */
export function useSyncUser() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) {
          if (!cancelled) {
            setLoading(false);
          }
          return;
        }

        // 1. Look for an existing row.
        const { data: existingUser, error: selectError } = await supabase
          .from('users')
          .select('id, email, name, avatar_url')
          .eq('id', authUser.id)
          .single();

        let appUser: AppUser | null = null;

        if (existingUser) {
          appUser = existingUser as AppUser;
        } else {
          // PGRST116 = "no rows found" from .single() — expected for new users.
          if (selectError && selectError.code !== 'PGRST116') {
            throw selectError;
          }

          // 2. First-time sign-in: create their row from the Google profile.
          const meta = authUser.user_metadata ?? {};
          const newRow = {
            id: authUser.id,
            email: authUser.email ?? '',
            name: meta.full_name ?? meta.name ?? null,
            avatar_url: meta.avatar_url ?? meta.picture ?? null,
          };

          const { data: insertedUser, error: insertError } = await supabase
            .from('users')
            .insert(newRow)
            .select('id, email, name, avatar_url')
            .single();

          if (insertError) throw insertError;
          appUser = insertedUser as AppUser;
        }

        if (appUser && !cancelled) {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appUser));
          setUser(appUser);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message ?? 'Failed to sync user');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    sync();
    return () => {
      cancelled = true;
    };
  }, []);

  return { user, loading, error };
}

export function getStoredUser(): AppUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as AppUser) : null;
}
