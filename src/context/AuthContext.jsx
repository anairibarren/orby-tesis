import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import { getMyProfile } from "../services/profiles";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);

  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);

  const [profileLoading, setProfileLoading] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setLoading(false);
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // cargar perfil cuando hay user
  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!user?.id) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);
      try {
        const data = await getMyProfile(user.id);
        if (!cancelled) setProfile(data);
      } catch (e) {
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  /**
   * ✅ Fuente de verdad: profiles.role
   * ✅ Fallback SOLO para evitar el “pantallazo” post-signup:
   *    si el trigger todavía no creó/cargó profiles, usamos metadata.role
   * ❌ NUNCA default "client" (porque rompe Google y te saltea RoleChoice)
   */
  const role = profile?.role ?? user?.user_metadata?.role ?? null;

  const value = useMemo(
    () => ({
      loading,
      session,
      user,
      role,
      profile,
      profileLoading,
      setProfile,
    }),
    [loading, session, user, role, profile, profileLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  return useContext(AuthContext);
}
