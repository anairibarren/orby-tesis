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
        return;
      }
      setProfileLoading(true);
      try {
        const data = await getMyProfile(user.id);
        if (!cancelled) setProfile(data);
      } catch (e) {
        // Si todavía no existe el perfil (por RLS o falta de trigger), lo dejamos null
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

  const role = profile?.role ?? user?.user_metadata?.role ?? "client";

  const value = useMemo(
    () => ({
      loading,
      session,
      user,
      role,
      profile,
      profileLoading,
      setProfile, // útil para actualizar después de onboarding
    }),
    [loading, session, user, role, profile, profileLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  return useContext(AuthContext);
}