import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, ShieldAlert, ArrowLeft, Plus, Pause, Play, Trash2, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  checkIsSuperAdmin, getSuperAdminOverview, createTenant, updateTenantStatus, deleteTenant,
} from "@/lib/super-admin.functions";

export const Route = createFileRoute("/super-admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Super Admin — FlexyMentor" }, { name: "robots", content: "noindex" }] }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
  },
  component: SuperAdminPage,
});

function SuperAdminPage() {
  const check = useServerFn(checkIsSuperAdmin);
  const overview = useServerFn(getSuperAdminOverview);
  const qc = useQueryClient();

  const access = useQuery({ queryKey: ["super", "check"], queryFn: () => check() });
  const data = useQuery({
    queryKey: ["super", "overview"],
    queryFn: () => overview(),
    enabled: access.data?.isSuperAdmin === true,
  });

  if (access.isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!access.data?.isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <Card className="max-w-md p-8 text-center">
          <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold mb-2">Accès refusé</h1>
          <p className="text-sm text-muted-foreground mb-6">Réservé aux super-administrateurs.</p>
          <Link to="/dashboard"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Retour</Button></Link>
        </Card>
      </div>
    );
  }

  const refresh = () => qc.invalidateQueries({ queryKey: ["super", "overview"] });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
        <div className="container max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
            <h1 className="font-display text-xl font-bold">Super Admin · FlexyMentor</h1>
            <Badge variant="secondary">Global</Badge>
          </div>
          <div className="flex items-center gap-2">
            <CreateTenantDialog onCreated={refresh} />
            <Link to="/tenant-admin"><Button size="sm" variant="outline">Mon organisation</Button></Link>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-6 py-8 space-y-8">
        {data.isLoading || !data.data ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat label="Organisations" value={data.data.stats.tenants} />
              <Stat label="Utilisateurs" value={data.data.stats.users} />
              <Stat label="Adhésions" value={data.data.stats.memberships} />
              <Stat label="Appels IA" value={data.data.stats.aiCalls} />
            </div>
            <TenantsTable tenants={data.data.tenants} onChange={refresh} />
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-display font-bold mt-1">{value}</div>
    </Card>
  );
}

function TenantsTable({ tenants, onChange }: { tenants: any[]; onChange: () => void }) {
  const statusFn = useServerFn(updateTenantStatus);
  const delFn = useServerFn(deleteTenant);
  const mutStatus = useMutation({
    mutationFn: (v: any) => statusFn({ data: v }),
    onSuccess: () => { toast.success("Statut mis à jour"); onChange(); },
    onError: (e: any) => toast.error(e.message),
  });
  const mutDel = useMutation({
    mutationFn: (tenantId: string) => delFn({ data: { tenantId } }),
    onSuccess: () => { toast.success("Organisation supprimée"); onChange(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow><TableHead>Organisation</TableHead><TableHead>Slug</TableHead><TableHead>Statut</TableHead><TableHead>Utilisateurs</TableHead><TableHead>IA</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {tenants.map((t) => (
            <TableRow key={t.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  {t.logo_url ? (
                    <img src={t.logo_url} alt="" className="h-8 w-8 rounded-lg object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: t.primary_color }}>
                      <Building2 className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div>
                    <div className="font-medium">{t.name}</div>
                    {t.description && <div className="text-xs text-muted-foreground line-clamp-1">{t.description}</div>}
                  </div>
                </div>
              </TableCell>
              <TableCell className="font-mono text-xs">{t.slug}</TableCell>
              <TableCell>
                <Badge variant={t.status === "active" ? "default" : t.status === "suspended" ? "destructive" : "secondary"}>
                  {t.status}
                </Badge>
              </TableCell>
              <TableCell>{t.stats.users}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {t.stats.ai} appels · {(t.stats.cost / 100).toFixed(2)} €
              </TableCell>
              <TableCell className="text-right space-x-1">
                {t.status === "active" ? (
                  <Button size="sm" variant="outline" onClick={() => mutStatus.mutate({ tenantId: t.id, status: "suspended" })}>
                    <Pause className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => mutStatus.mutate({ tenantId: t.id, status: "active" })}>
                    <Play className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Supprimer ${t.name} ?`)) mutDel.mutate(t.id); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {tenants.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucune organisation</TableCell></TableRow>}
        </TableBody>
      </Table>
    </Card>
  );
}

function CreateTenantDialog({ onCreated }: { onCreated: () => void }) {
  const fn = useServerFn(createTenant);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", slug: "", description: "",
    primary_color: "oklch(0.55 0.22 262)", secondary_color: "oklch(0.72 0.15 180)",
    logo_url: "", welcome_message: "",
  });
  const mut = useMutation({
    mutationFn: () => fn({
      data: {
        name: form.name, slug: form.slug,
        description: form.description || undefined,
        primary_color: form.primary_color || undefined,
        secondary_color: form.secondary_color || undefined,
        logo_url: form.logo_url || undefined,
        welcome_message: form.welcome_message || undefined,
      },
    }),
    onSuccess: () => { toast.success("Organisation créée"); setOpen(false); onCreated(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" />Nouvelle organisation</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Créer une organisation</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="Nom"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Slug (URL)"><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} placeholder="alpha-school" /></Field>
          <Field label="Description"><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Couleur primaire"><Input value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} /></Field>
            <Field label="Couleur secondaire"><Input value={form.secondary_color} onChange={(e) => setForm({ ...form, secondary_color: e.target.value })} /></Field>
          </div>
          <Field label="Logo (URL)"><Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://…" /></Field>
          <Field label="Message d'accueil"><Textarea rows={2} value={form.welcome_message} onChange={(e) => setForm({ ...form, welcome_message: e.target.value })} /></Field>
          <Button onClick={() => mut.mutate()} disabled={!form.name.trim() || !form.slug.trim() || mut.isPending} className="w-full">
            {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Créer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
