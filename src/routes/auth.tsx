import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GraduationCap, Mail, Apple, ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — FlexyMentor" },
      { name: "description", content: "Connecte-toi à FlexyMentor et commence à transformer tes cours grâce à l'IA." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"choice" | "signin" | "signup">("choice");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirige si déjà connecté
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/dashboard", replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { display_name: name },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/dashboard",
    });
    if (result.error) {
      setError(result.error instanceof Error ? result.error.message : "Connexion Google impossible.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft flex flex-col">
      <header className="container mx-auto px-6 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-smooth">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-10 animate-fade-up">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-hero shadow-glow mb-5 animate-pulse-glow">
              <GraduationCap className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="font-display text-4xl font-extrabold tracking-tight">
              {mode === "choice" ? "Bienvenue sur FlexyMentor" : mode === "signup" ? "Crée ton compte" : "Bon retour !"}
            </h1>
            <p className="mt-3 text-muted-foreground">
              {mode === "choice" ? "Tes cours deviennent un jeu d'enfant." : mode === "signup" ? "Quelques infos et c'est parti." : "Connecte-toi pour continuer."}
            </p>
          </div>

          <div className="rounded-3xl bg-gradient-card border border-border shadow-card p-7 animate-fade-up" style={{ animationDelay: "0.1s" }}>
            {mode === "choice" ? (
              <div className="space-y-3">
                <AuthButton icon={<GoogleIcon />} label="Continuer avec Google" onClick={handleGoogle} disabled={loading} />
                <AuthButton
                  icon={<Mail className="h-5 w-5" />}
                  label="Créer un compte"
                  primary
                  onClick={() => setMode("signup")}
                />
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-smooth pt-2"
                >
                  J'ai déjà un compte → Se connecter
                </button>
                {error && (
                  <div className="rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <p className="text-xs text-center text-muted-foreground pt-3">
                  En continuant, tu acceptes nos conditions d'utilisation.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <Field label="Nom" value={name} onChange={setName} placeholder="Ton prénom" type="text" />
                )}
                <Field label="Email" value={email} onChange={setEmail} placeholder="toi@email.com" type="email" />
                <Field label="Mot de passe" value={password} onChange={setPassword} placeholder="Au moins 8 caractères" type="password" />
                {error && (
                  <div className="rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-hero px-6 py-3.5 text-base font-semibold text-primary-foreground shadow-glow hover:scale-[1.01] transition-smooth disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {mode === "signup" ? "Créer mon compte" : "Se connecter"}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("choice")}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-smooth"
                >
                  ← Autres options
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function AuthButton({
  icon, label, primary, onClick, disabled,
}: { icon: React.ReactNode; label: string; primary?: boolean; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full inline-flex items-center justify-center gap-3 rounded-2xl px-6 py-3.5 text-base font-semibold transition-smooth disabled:opacity-60 ${
        primary
          ? "bg-gradient-hero text-primary-foreground shadow-glow hover:scale-[1.01]"
          : "bg-card border border-border hover:bg-accent"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Field({
  label, value, onChange, placeholder, type,
}: { label: string; value: string; onChange: (v: string) => void; placeholder: string; type: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground mb-1.5 block">{label}</span>
      <input
        type={type}
        value={value}
        required
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-smooth"
      />
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}
