import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, ShieldAlert, ArrowLeft, Users, BarChart3, Brain, CreditCard, Megaphone, Flag, Settings as SettingsIcon, Trash2, Plus, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  getAdminOverview, setUserRole, deleteUserProfile, upsertAnnouncement, deleteAnnouncement,
  updateSubscription, resolveReport, setSystemSetting, checkIsAdmin,
} from "@/lib/admin.functions";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin — FlexyMentor" }, { name: "robots", content: "noindex" }] }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
  },
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const check = useServerFn(checkIsAdmin);
  const overviewFn = useServerFn(getAdminOverview);
  const qc = useQueryClient();

  const adminCheck = useQuery({ queryKey: ["admin", "check"], queryFn: () => check() });
  const overview = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => overviewFn(),
    enabled: adminCheck.data?.isAdmin === true,
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/auth", replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  if (adminCheck.isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (adminCheck.isError || !adminCheck.data?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <Card className="max-w-md p-8 text-center">
          <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold mb-2">Accès refusé</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Vous n'avez pas les autorisations nécessaires pour accéder à l'espace administrateur.
          </p>
          <Link to="/dashboard"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Retour</Button></Link>
        </Card>
      </div>
    );
  }

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "overview"] });
  const data = overview.data;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
        <div className="container max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
            <h1 className="font-display text-xl font-bold">Admin · FlexyMentor</h1>
            <Badge variant="secondary">Admin</Badge>
          </div>
          <Button size="sm" variant="outline" onClick={refresh}>Actualiser</Button>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-6 py-8">
        {overview.isLoading || !data ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <>
            <StatsGrid stats={data.stats} />
            <Tabs defaultValue="users" className="mt-8">
              <TabsList className="flex flex-wrap h-auto">
                <TabsTrigger value="users"><Users className="h-4 w-4 mr-2" />Utilisateurs</TabsTrigger>
                <TabsTrigger value="analytics"><BarChart3 className="h-4 w-4 mr-2" />Analytics</TabsTrigger>
                <TabsTrigger value="ai"><Brain className="h-4 w-4 mr-2" />IA</TabsTrigger>
                <TabsTrigger value="subs"><CreditCard className="h-4 w-4 mr-2" />Abonnements</TabsTrigger>
                <TabsTrigger value="announcements"><Megaphone className="h-4 w-4 mr-2" />Annonces</TabsTrigger>
                <TabsTrigger value="moderation"><Flag className="h-4 w-4 mr-2" />Modération</TabsTrigger>
                <TabsTrigger value="settings"><SettingsIcon className="h-4 w-4 mr-2" />Paramètres</TabsTrigger>
              </TabsList>
              <TabsContent value="users" className="mt-6"><UsersTab profiles={data.profiles} roles={data.roles} onChange={refresh} /></TabsContent>
              <TabsContent value="analytics" className="mt-6"><AnalyticsTab data={data} /></TabsContent>
              <TabsContent value="ai" className="mt-6"><AiTab usage={data.aiUsage} /></TabsContent>
              <TabsContent value="subs" className="mt-6"><SubsTab subs={data.subscriptions} onChange={refresh} /></TabsContent>
              <TabsContent value="announcements" className="mt-6"><AnnouncementsTab items={data.announcements} onChange={refresh} /></TabsContent>
              <TabsContent value="moderation" className="mt-6"><ModerationTab reports={data.reports} onChange={refresh} /></TabsContent>
              <TabsContent value="settings" className="mt-6"><SettingsTab onChange={refresh} /></TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}

function StatsGrid({ stats }: { stats: any }) {
  const items = [
    { label: "Utilisateurs", value: stats.users },
    { label: "Admins", value: stats.admins },
    { label: "Modérateurs", value: stats.moderators },
    { label: "Abonnements actifs", value: stats.activeSubs },
    { label: "Signalements ouverts", value: stats.openReports },
    { label: "Appels IA", value: stats.aiCalls },
    { label: "Tokens IA", value: stats.totalTokens.toLocaleString() },
    { label: "Coût IA", value: `${(stats.totalCostCents / 100).toFixed(2)} €` },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((s) => (
        <Card key={s.label} className="p-4">
          <div className="text-xs text-muted-foreground">{s.label}</div>
          <div className="text-2xl font-display font-bold mt-1">{s.value}</div>
        </Card>
      ))}
    </div>
  );
}

function UsersTab({ profiles, roles, onChange }: any) {
  const setRole = useServerFn(setUserRole);
  const delUser = useServerFn(deleteUserProfile);
  const mutRole = useMutation({
    mutationFn: (v: any) => setRole({ data: v }),
    onSuccess: () => { toast.success("Rôle mis à jour"); onChange(); },
    onError: (e: any) => toast.error(e.message),
  });
  const mutDel = useMutation({
    mutationFn: (userId: string) => delUser({ data: { userId } }),
    onSuccess: () => { toast.success("Utilisateur supprimé"); onChange(); },
    onError: (e: any) => toast.error(e.message),
  });
  const roleMap = new Map<string, string[]>();
  for (const r of roles) {
    const list = roleMap.get(r.user_id) ?? [];
    list.push(r.role);
    roleMap.set(r.user_id, list);
  }
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow><TableHead>Utilisateur</TableHead><TableHead>Rôles</TableHead><TableHead>Stats</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {profiles.map((p: any) => {
            const userRoles = roleMap.get(p.id) ?? [];
            return (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="font-medium">{p.display_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground font-mono">{p.id.slice(0, 8)}…</div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {(["admin", "moderator"] as const).map((r) => {
                      const enabled = userRoles.includes(r);
                      return (
                        <Button key={r} size="sm" variant={enabled ? "default" : "outline"}
                          onClick={() => mutRole.mutate({ userId: p.id, role: r, enabled: !enabled })}>
                          {r}
                        </Button>
                      );
                    })}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {p.courses_count} cours · {p.quizzes_passed} quiz · 🔥 {p.streak_days}j
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm("Supprimer ce profil ?")) mutDel.mutate(p.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
          {profiles.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Aucun utilisateur</TableCell></TableRow>}
        </TableBody>
      </Table>
    </Card>
  );
}

function AnalyticsTab({ data }: any) {
  const last7 = countByDay(data.aiUsage, 7);
  const max = Math.max(1, ...last7.map((d) => d.count));
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Appels IA — 7 derniers jours</h3>
        <div className="flex items-end gap-2 h-40">
          {last7.map((d) => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-primary rounded-t" style={{ height: `${(d.count / max) * 100}%`, minHeight: 4 }} />
              <div className="text-[10px] text-muted-foreground">{d.day}</div>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Répartition des plans</h3>
        <div className="space-y-2">
          {groupBy(data.subscriptions, "plan").map((g) => (
            <div key={g.key} className="flex justify-between text-sm"><span>{g.key}</span><span className="font-mono">{g.count}</span></div>
          ))}
          {data.subscriptions.length === 0 && <p className="text-sm text-muted-foreground">Aucun abonnement</p>}
        </div>
      </Card>
    </div>
  );
}

function AiTab({ usage }: any) {
  const byModel = groupBy(usage, "model");
  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Utilisation par modèle</h3>
        <Table>
          <TableHeader><TableRow><TableHead>Modèle</TableHead><TableHead>Appels</TableHead></TableRow></TableHeader>
          <TableBody>
            {byModel.map((g) => <TableRow key={g.key}><TableCell>{g.key}</TableCell><TableCell>{g.count}</TableCell></TableRow>)}
            {byModel.length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-6">Aucun appel enregistré</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function SubsTab({ subs, onChange }: any) {
  const upd = useServerFn(updateSubscription);
  const mut = useMutation({
    mutationFn: (v: any) => upd({ data: v }),
    onSuccess: () => { toast.success("Abonnement mis à jour"); onChange(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Card>
      <Table>
        <TableHeader><TableRow><TableHead>Utilisateur</TableHead><TableHead>Plan</TableHead><TableHead>Statut</TableHead><TableHead>Renouvellement</TableHead></TableRow></TableHeader>
        <TableBody>
          {subs.map((s: any) => (
            <TableRow key={s.id}>
              <TableCell className="font-mono text-xs">{s.user_id.slice(0, 8)}…</TableCell>
              <TableCell>
                <select className="border rounded px-2 py-1 text-sm bg-background" defaultValue={s.plan}
                  onChange={(e) => mut.mutate({ userId: s.user_id, plan: e.target.value, status: s.status })}>
                  <option value="free">free</option><option value="pro">pro</option><option value="team">team</option>
                </select>
              </TableCell>
              <TableCell>
                <select className="border rounded px-2 py-1 text-sm bg-background" defaultValue={s.status}
                  onChange={(e) => mut.mutate({ userId: s.user_id, plan: s.plan, status: e.target.value })}>
                  <option value="active">active</option><option value="canceled">canceled</option><option value="past_due">past_due</option>
                </select>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : "—"}</TableCell>
            </TableRow>
          ))}
          {subs.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Aucun abonnement</TableCell></TableRow>}
        </TableBody>
      </Table>
    </Card>
  );
}

function AnnouncementsTab({ items, onChange }: any) {
  const upsert = useServerFn(upsertAnnouncement);
  const del = useServerFn(deleteAnnouncement);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const mutCreate = useMutation({
    mutationFn: () => upsert({ data: { title, body, published: true } }),
    onSuccess: () => { toast.success("Annonce publiée"); setTitle(""); setBody(""); onChange(); },
    onError: (e: any) => toast.error(e.message),
  });
  const mutDel = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Supprimée"); onChange(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-3">
        <h3 className="font-semibold">Nouvelle annonce</h3>
        <Input placeholder="Titre" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        <Textarea placeholder="Contenu" value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} rows={4} />
        <Button onClick={() => mutCreate.mutate()} disabled={!title.trim() || !body.trim() || mutCreate.isPending}>
          <Plus className="h-4 w-4 mr-2" />Publier
        </Button>
      </Card>
      <div className="space-y-3">
        {items.map((a: any) => (
          <Card key={a.id} className="p-4 flex justify-between gap-4">
            <div>
              <div className="flex items-center gap-2"><h4 className="font-semibold">{a.title}</h4>{!a.published && <Badge variant="outline">Brouillon</Badge>}</div>
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{a.body}</p>
              <p className="text-xs text-muted-foreground mt-2">{new Date(a.created_at).toLocaleString()}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => mutDel.mutate(a.id)}><Trash2 className="h-4 w-4" /></Button>
          </Card>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Aucune annonce</p>}
      </div>
    </div>
  );
}

function ModerationTab({ reports, onChange }: any) {
  const resolve = useServerFn(resolveReport);
  const mut = useMutation({
    mutationFn: (v: any) => resolve({ data: v }),
    onSuccess: () => { toast.success("Mis à jour"); onChange(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Card>
      <Table>
        <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Raison</TableHead><TableHead>Statut</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
        <TableBody>
          {reports.map((r: any) => (
            <TableRow key={r.id}>
              <TableCell>{r.content_type}</TableCell>
              <TableCell className="text-sm">{r.reason}</TableCell>
              <TableCell><Badge variant={r.status === "open" ? "destructive" : "secondary"}>{r.status}</Badge></TableCell>
              <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
              <TableCell className="text-right space-x-1">
                <Button size="sm" variant="outline" onClick={() => mut.mutate({ id: r.id, status: "resolved" })}>Résoudre</Button>
                <Button size="sm" variant="ghost" onClick={() => mut.mutate({ id: r.id, status: "dismissed" })}>Rejeter</Button>
              </TableCell>
            </TableRow>
          ))}
          {reports.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Aucun signalement</TableCell></TableRow>}
        </TableBody>
      </Table>
    </Card>
  );
}

function SettingsTab({ onChange }: any) {
  const set = useServerFn(setSystemSetting);
  const [key, setKey] = useState("maintenance_mode");
  const [value, setValue] = useState("false");
  const mut = useMutation({
    mutationFn: () => {
      let parsed: any = value;
      try { parsed = JSON.parse(value); } catch {}
      return set({ data: { key, value: parsed } });
    },
    onSuccess: () => { toast.success("Paramètre enregistré"); onChange(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Card className="p-6 space-y-4 max-w-2xl">
      <h3 className="font-semibold">Paramètres système</h3>
      <p className="text-sm text-muted-foreground">Définissez des paires clé/valeur (JSON) utilisées par l'application.</p>
      <div className="space-y-2">
        <label className="text-sm font-medium">Clé</label>
        <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="ex: maintenance_mode" />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Valeur (JSON)</label>
        <Textarea value={value} onChange={(e) => setValue(e.target.value)} rows={4} placeholder='ex: true, "message", {"foo":1}' />
      </div>
      <Button onClick={() => mut.mutate()} disabled={!key.trim() || mut.isPending}>
        <Save className="h-4 w-4 mr-2" />Enregistrer
      </Button>
    </Card>
  );
}

// helpers
function countByDay(rows: any[], days: number) {
  const out: { day: string; count: number }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now); d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(5, 10);
    const count = rows.filter((r) => r.created_at?.startsWith(d.toISOString().slice(0, 10))).length;
    out.push({ day: key, count });
  }
  return out;
}
function groupBy(rows: any[], field: string) {
  const m = new Map<string, number>();
  for (const r of rows) m.set(r[field] ?? "—", (m.get(r[field] ?? "—") ?? 0) + 1);
  return Array.from(m, ([key, count]) => ({ key, count }));
}
