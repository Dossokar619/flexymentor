import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ScanLine, FileText, Sparkles, BookOpen, Brain, Mic, Trophy, History,
  ArrowRight, Check, GraduationCap, Zap, ShieldCheck, Apple, Mail,
} from "lucide-react";
import heroImg from "@/assets/hero-students.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FlexyProf — Tes cours deviennent un jeu d'enfant" },
      { name: "description", content: "L'app IA qui résume, explique et transforme tes cours en quiz et exercices personnalisés." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: ScanLine, title: "Scanner un cours", desc: "Prends en photo ton cours, l'IA fait le reste." },
  { icon: FileText, title: "Importer un PDF", desc: "Glisse un PDF, reçois un résumé clair en quelques secondes." },
  { icon: Sparkles, title: "Résumer & simplifier", desc: "Des explications limpides, comme si on te parlait." },
  { icon: Brain, title: "Expliquer comme à un enfant", desc: "L'IA reformule jusqu'à ce que tout soit lumineux." },
  { icon: Trophy, title: "Exercices & quiz", desc: "Entraîne-toi avec des QCM, vrai/faux, exercices corrigés." },
  { icon: Mic, title: "Mode vocal", desc: "Pose tes questions à l'oral, reçois une réponse instantanée." },
  { icon: BookOpen, title: "Fiches de révision", desc: "Génère des fiches mémo prêtes à apprendre." },
  { icon: History, title: "Historique organisé", desc: "Retrouve tous tes cours classés par matière." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-soft">
      {/* NAV */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/50">
        <nav className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-hero shadow-glow">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight">FlexyProf</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-smooth">Fonctionnalités</a>
            <a href="#how" className="hover:text-foreground transition-smooth">Comment ça marche</a>
            <a href="#pricing" className="hover:text-foreground transition-smooth">Étudiants</a>
          </div>
          <Link to="/auth" className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:opacity-90 transition-smooth">
            Commencer <ArrowRight className="h-4 w-4" />
          </Link>
        </nav>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-glow pointer-events-none" />
        <div className="container mx-auto px-6 pt-16 pb-24 md:pt-24 md:pb-32 grid lg:grid-cols-2 gap-12 items-center relative">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 backdrop-blur px-4 py-1.5 text-xs font-medium text-muted-foreground mb-6">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Propulsé par l'intelligence artificielle
            </div>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight">
              Tes cours deviennent un <span className="text-gradient">jeu d'enfant</span>.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
              FlexyProf scanne, résume, explique et transforme tes cours en quiz personnalisés.
              L'app qui rend l'apprentissage <strong className="text-foreground font-semibold">simple, fluide et motivant</strong>.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link to="/auth" className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-hero px-7 py-4 text-base font-semibold text-primary-foreground shadow-glow hover:scale-[1.02] transition-smooth animate-pulse-glow">
                Démarrer gratuitement <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#features" className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-7 py-4 text-base font-semibold text-foreground hover:bg-accent transition-smooth">
                Découvrir
              </a>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Sans carte bancaire</div>
              <div className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> 100% étudiants</div>
            </div>
          </div>

          <div className="relative animate-fade-up" style={{ animationDelay: "0.2s" }}>
            <div className="absolute -inset-8 bg-gradient-hero opacity-20 blur-3xl rounded-full" />
            <div className="relative rounded-3xl overflow-hidden shadow-glow bg-gradient-card border border-border/50">
              <img
                src={heroImg}
                alt="Étudiants apprenant avec l'IA de FlexyProf"
                width={1536}
                height={1152}
                className="w-full h-auto"
              />
            </div>
            <FloatingCard className="absolute -left-4 top-12 animate-float" style={{ animationDelay: "0.5s" }}>
              <Zap className="h-4 w-4 text-cyan-bright" />
              <span>Résumé en 3 secondes</span>
            </FloatingCard>
            <FloatingCard className="absolute -right-2 bottom-16 animate-float" style={{ animationDelay: "1.5s" }}>
              <Trophy className="h-4 w-4 text-violet-soft" />
              <span>+12 quiz réussis</span>
            </FloatingCard>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="container mx-auto px-6 py-24">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Fonctionnalités</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
            Tout ce qu'il faut pour <span className="text-gradient">cartonner</span> en cours
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Une seule app, toutes tes matières, des résultats qui suivent.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="group relative rounded-2xl bg-gradient-card border border-border p-6 shadow-card hover:shadow-glow hover:-translate-y-1 transition-smooth"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-hero shadow-md mb-4 group-hover:scale-110 transition-smooth">
                <f.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-1.5">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="container mx-auto px-6 py-24">
        <div className="rounded-[2rem] bg-gradient-hero p-10 md:p-16 text-primary-foreground relative overflow-hidden shadow-glow">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,white,transparent_50%)] opacity-20" />
          <div className="relative grid md:grid-cols-3 gap-8">
            {[
              { n: "01", t: "Capture ton cours", d: "Photo, PDF, texte ou vocal — peu importe la source." },
              { n: "02", t: "L'IA analyse tout", d: "Compréhension instantanée, langage clair et pédagogique." },
              { n: "03", t: "Apprends & révise", d: "Résumés, fiches, quiz et corrections personnalisées." },
            ].map((s) => (
              <div key={s.n}>
                <div className="font-display text-5xl font-extrabold opacity-30 mb-3">{s.n}</div>
                <h3 className="font-display text-2xl font-bold mb-2">{s.t}</h3>
                <p className="text-primary-foreground/85 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className="container mx-auto px-6 py-24">
        <div className="max-w-3xl mx-auto text-center">
          <ShieldCheck className="h-12 w-12 mx-auto text-primary mb-4" />
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
            Prêt à transformer ta façon d'apprendre&nbsp;?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Rejoins les étudiants qui révisent plus vite et mieux avec FlexyProf.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/auth" className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-hero px-8 py-4 text-base font-semibold text-primary-foreground shadow-glow hover:scale-[1.02] transition-smooth">
              <Mail className="h-4 w-4" /> Continuer avec Email
            </Link>
            <Link to="/auth" className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-8 py-4 text-base font-semibold hover:bg-accent transition-smooth">
              <Apple className="h-4 w-4" /> Continuer avec Apple
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-10">
        <div className="container mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-hero">
              <GraduationCap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-foreground">FlexyProf</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <p>Fait avec ❤️ pour les étudiants.</p>
        </div>
      </footer>
    </div>
  );
}

function FloatingCard({
  children, className = "", style,
}: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      style={style}
      className={`hidden md:flex items-center gap-2 rounded-2xl bg-card/95 backdrop-blur border border-border px-4 py-2.5 text-sm font-semibold shadow-card ${className}`}
    >
      {children}
    </div>
  );
}
