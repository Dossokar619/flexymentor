import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { GraduationCap, Mail, Apple, ArrowLeft, Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — FlexyProf" },
      { name: "description", content: "Connecte-toi à FlexyProf et commence à transformer tes cours grâce à l'IA." },
    ],
  }),
  component: AuthPage,
});

// Domaines email autorisés (anti-jetables)
const ALLOWED_DOMAINS = [
  "gmail.com", "googlemail.com",
  "outlook.com", "hotmail.com", "live.com", "msn.com",
  "yahoo.com", "yahoo.fr",
  "icloud.com", "me.com", "mac.com",
  "protonmail.com", "proton.me", "pm.me",
  "orange.fr", "free.fr", "laposte.net", "sfr.fr", "wanadoo.fr",
];

function isAllowedEmail(email: string) {
  const domain = email.toLowerCase().split("@")[1];
  return !!domain && ALLOWED_DOMAINS.includes(domain);
}

function AuthPage() {
  const [mode, setMode] = useState<"choice" | "email">("choice");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isAllowedEmail(email)) {
      setError("Cet email n'est pas accepté. Utilise Gmail, Outlook, Yahoo, iCloud ou ProtonMail.");
      return;
    }
    // Démo : redirige vers le dashboard
    window.location.href = "/dashboard";
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
              {mode === "choice" ? "Bienvenue sur FlexyProf" : "Crée ton compte"}
            </h1>
            <p className="mt-3 text-muted-foreground">
              {mode === "choice" ? "Tes cours deviennent un jeu d'enfant." : "Quelques infos et c'est parti."}
            </p>
          </div>

          <div className="rounded-3xl bg-gradient-card border border-border shadow-card p-7 animate-fade-up" style={{ animationDelay: "0.1s" }}>
            {mode === "choice" ? (
              <div className="space-y-3">
                <AuthButton icon={<GoogleIcon />} label="Continuer avec Google" />
                <AuthButton icon={<Apple className="h-5 w-5" />} label="Continuer avec Apple" />
                <AuthButton
                  icon={<Mail className="h-5 w-5" />}
                  label="Continuer avec Email"
                  primary
                  onClick={() => setMode("email")}
                />
                <p className="text-xs text-center text-muted-foreground pt-3">
                  En continuant, tu acceptes nos conditions d'utilisation.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Field label="Nom" value={name} onChange={setName} placeholder="Ton prénom" type="text" />
                <Field label="Email" value={email} onChange={setEmail} placeholder="toi@gmail.com" type="email" />
                <Field label="Mot de passe" value={password} onChange={setPassword} placeholder="Au moins 8 caractères" type="password" />
                {error && (
                  <div className="rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-hero px-6 py-3.5 text-base font-semibold text-primary-foreground shadow-glow hover:scale-[1.01] transition-smooth"
                >
                  <Sparkles className="h-4 w-4" /> Créer mon compte
                </button>
                <button
                  type="button"
                  onClick={() => setMode("choice")}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-smooth"
                >
                  ← Autres options de connexion
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
  icon, label, primary, onClick,
}: { icon: React.ReactNode; label: string; primary?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full inline-flex items-center justify-center gap-3 rounded-2xl px-6 py-3.5 text-base font-semibold transition-smooth ${
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
