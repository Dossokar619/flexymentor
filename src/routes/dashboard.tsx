import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ScanLine, FileText, Sparkles, BookOpen, Brain, Mic, Trophy,
  Home, Folder, Dumbbell, User, Search, Bell, GraduationCap, LogOut, Loader2, Shield, Building2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/components/tenant-provider";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Accueil — FlexyMentor" }],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/auth" });
    }
  },
  component: Dashboard,
});

const actions = [
  { icon: ScanLine, title: "Scanner un cours" },
  { icon: FileText, title: "Importer un PDF" },
  { icon: Sparkles, title: "Résumer un texte" },
  { icon: Brain, title: "Expliquer un cours" },
  { icon: Dumbbell, title: "Générer exercices" },
  { icon: Trophy, title: "Quiz intelligent" },
];

interface Profile {
  display_name: string | null;
  streak_days: number;
  courses_count: number;
  quizzes_passed: number;
}

function Dashboard() {
  const navigate = useNavigate();
  const { tenant, isSuperAdmin, isTenantAdmin } = useTenant();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate({ to: "/auth", replace: true });
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("display_name, streak_days, courses_count, quizzes_passed")
        .eq("id", user.id)
        .maybeSingle();
      setProfile(data ?? { display_name: user.email?.split("@")[0] ?? null, streak_days: 0, courses_count: 0, quizzes_passed: 0 });
      setLoading(false);
    };
    load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/auth", replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft pb-28">
      {/* Top bar */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="container mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            {tenant?.logo_url ? (
              <img src={tenant.logo_url} alt="" className="h-9 w-9 rounded-xl object-cover shadow-md" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-hero shadow-md">
                <GraduationCap className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
            <span className="font-display font-bold">{tenant?.name ?? "FlexyMentor"}</span>
          </Link>
          <div className="flex items-center gap-2">
            {isTenantAdmin && (
              <Link to="/tenant-admin" className="h-10 w-10 inline-flex items-center justify-center rounded-full hover:bg-accent transition-smooth" aria-label="Administration organisation" title="Administration">
                <Building2 className="h-5 w-5" />
              </Link>
            )}
            {isSuperAdmin && (
              <Link to="/super-admin" className="h-10 w-10 inline-flex items-center justify-center rounded-full hover:bg-accent transition-smooth" aria-label="Super Admin" title="Super Admin">
                <Shield className="h-5 w-5" />
              </Link>
            )}
            <button className="h-10 w-10 inline-flex items-center justify-center rounded-full hover:bg-accent transition-smooth" aria-label="Notifications">
              <Bell className="h-5 w-5" />
            </button>
            <button
              onClick={handleSignOut}
              className="h-10 w-10 inline-flex items-center justify-center rounded-full hover:bg-accent transition-smooth"
              aria-label="Déconnexion"
              title="Déconnexion"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-6 pt-8">
        {/* Greeting */}
        <div className="animate-fade-up">
          <p className="text-sm font-medium text-muted-foreground">
            Bonjour {profile?.display_name ?? ""} 👋
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight mt-1">
            Prêt à <span className="text-gradient">briller</span> aujourd'hui&nbsp;?
          </h1>
        </div>

        {/* Quick stats */}
        <div className="mt-6 grid grid-cols-3 gap-3 animate-fade-up" style={{ animationDelay: "0.05s" }}>
          {[
            { label: "Cours", value: profile?.courses_count ?? 0 },
            { label: "Quiz réussis", value: profile?.quizzes_passed ?? 0 },
            { label: "Série", value: `${profile?.streak_days ?? 0}j 🔥` },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-gradient-card border border-border p-4 shadow-card text-center">
              <div className="font-display text-xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Actions grid */}
        <h2 className="font-display text-lg font-bold mt-10 mb-4">Que veux-tu faire&nbsp;?</h2>
        <div className="grid grid-cols-2 gap-4">
          {actions.map((a, i) => (
            <button
              key={a.title}
              className="group relative overflow-hidden rounded-2xl bg-gradient-card border border-border p-5 text-left shadow-card hover:shadow-glow hover:-translate-y-1 transition-smooth animate-fade-up"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-hero shadow-md mb-3 group-hover:scale-110 transition-smooth">
                <a.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="font-semibold text-sm leading-tight">{a.title}</div>
            </button>
          ))}
        </div>

        {/* Voice CTA */}
        <div className="mt-10 rounded-3xl bg-gradient-hero p-6 text-primary-foreground shadow-glow relative overflow-hidden">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div className="h-14 w-14 inline-flex items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <Mic className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <div className="font-display font-bold text-lg">Pose ta question à l'oral</div>
              <p className="text-sm text-primary-foreground/85">FlexyMentor t'écoute et te répond instantanément.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md">
        <div className="rounded-full bg-card/95 backdrop-blur-xl border border-border shadow-glow px-2 py-2 flex items-center justify-around">
          <NavBtn icon={Home} label="Accueil" active />
          <NavBtn icon={Folder} label="Cours" />
          <NavBtn icon={Dumbbell} label="Exos" />
          <NavBtn icon={User} label="Profil" />
        </div>
      </nav>
    </div>
  );
}

function NavBtn({ icon: Icon, label, active }: { icon: typeof Home; label: string; active?: boolean }) {
  return (
    <button
      className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-full transition-smooth ${
        active ? "bg-gradient-hero text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[10px] font-semibold">{label}</span>
    </button>
  );
}
