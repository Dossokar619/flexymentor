import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ScanLine, FileText, Sparkles, BookOpen, Brain, Mic, Trophy, History,
  Home, Folder, Dumbbell, User, Search, Bell, GraduationCap,
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Accueil — FlexyProf" }],
  }),
  component: Dashboard,
});

const actions = [
  { icon: ScanLine, title: "Scanner un cours", color: "from-blue-500 to-blue-600" },
  { icon: FileText, title: "Importer un PDF", color: "from-violet-500 to-blue-500" },
  { icon: Sparkles, title: "Résumer un texte", color: "from-cyan-500 to-blue-500" },
  { icon: Brain, title: "Expliquer un cours", color: "from-indigo-500 to-violet-500" },
  { icon: Dumbbell, title: "Générer exercices", color: "from-blue-600 to-cyan-500" },
  { icon: Trophy, title: "Quiz intelligent", color: "from-violet-500 to-purple-500" },
];

function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-soft pb-28">
      {/* Top bar */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="container mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-hero shadow-md">
              <GraduationCap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold">FlexyProf</span>
          </Link>
          <div className="flex items-center gap-2">
            <button className="h-10 w-10 inline-flex items-center justify-center rounded-full hover:bg-accent transition-smooth">
              <Search className="h-5 w-5" />
            </button>
            <button className="h-10 w-10 inline-flex items-center justify-center rounded-full hover:bg-accent transition-smooth">
              <Bell className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-6 pt-8">
        {/* Greeting */}
        <div className="animate-fade-up">
          <p className="text-sm font-medium text-muted-foreground">Bonjour 👋</p>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight mt-1">
            Prêt à <span className="text-gradient">briller</span> aujourd'hui&nbsp;?
          </h1>
        </div>

        {/* Quick stats */}
        <div className="mt-6 grid grid-cols-3 gap-3 animate-fade-up" style={{ animationDelay: "0.05s" }}>
          {[
            { label: "Cours", value: "12" },
            { label: "Quiz réussis", value: "34" },
            { label: "Série", value: "5j 🔥" },
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

        {/* History */}
        <h2 className="font-display text-lg font-bold mt-10 mb-4 flex items-center justify-between">
          <span>Cours récents</span>
          <button className="text-xs font-medium text-primary">Voir tout</button>
        </h2>
        <div className="space-y-3">
          {[
            { title: "Chapitre 4 — La Révolution française", subj: "Histoire", time: "Il y a 2h" },
            { title: "Théorème de Pythagore", subj: "Mathématiques", time: "Hier" },
            { title: "La photosynthèse", subj: "SVT", time: "Lundi" },
          ].map((c) => (
            <div key={c.title} className="flex items-center gap-4 rounded-2xl bg-gradient-card border border-border p-4 shadow-card hover:shadow-glow transition-smooth">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{c.title}</div>
                <div className="text-xs text-muted-foreground">{c.subj} · {c.time}</div>
              </div>
            </div>
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
              <p className="text-sm text-primary-foreground/85">FlexyProf t'écoute et te répond instantanément.</p>
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
